#!/usr/bin/env python3
"""
ASIS — Stage 01: Floor Plan Parser  v2.0.0
==========================================
Tuned for clean digital floor plans with:
  • White background     (gray = 255)
  • Dark walls           (gray < 50, thickness 8-12 px)
  • Cream room fill      (gray 200-252)
  • Door arcs            (quarter-circles at wall junctions)
  • Windows              (thin-frame gaps in outer walls, ~50 px wide)

Input  : sys.argv[1] — absolute path to floor plan image (PNG / JPEG)
Output : JSON to stdout ONLY — always valid, even on hard failure
Debug  : stderr only — Node.js reads stdout exclusively

Three.js usage
--------------
All coordinates are normalised to [0.0, 1.0].
Multiply x by real_width_m and y by real_height_m to get metres.
Wall height: assume 3.0 m unless overridden by the caller.
"""

import sys
import json
import math
import cv2
import numpy as np


# ══════════════════════════════════════════════════════════════════
# CONFIG — every tunable constant lives here
# ══════════════════════════════════════════════════════════════════

CFG = {
    # ── Wall isolation ────────────────────────────────────────────
    "wall_dark_thresh":        50,    # gray < this → wall pixel

    # ── HoughLinesP ──────────────────────────────────────────────
    "hough_rho":               1,
    "hough_theta":             math.pi / 180,
    "hough_threshold":         60,
    "hough_min_length":        50,    # ignore very short segments
    "hough_max_gap":           15,

    # ── Wall clustering (thick wall → single midline) ─────────────
    "cluster_tol_px":          12,

    # ── Room detection (grid-cell approach) ───────────────────────
    "wall_half_thickness":     8,     # px either side of midline to skip
    "room_fill_min":           190,   # cream lower bound (gray)
    "room_fill_max":           253,   # cream upper bound (gray)
    "room_min_area_px":        3000,  # px² — smaller = noise

    # ── Door arc detection ────────────────────────────────────────
    "arc_canny_low":           30,
    "arc_canny_high":          100,
    "arc_dp":                  1.2,
    "arc_min_dist":            60,    # min px between two arc centres
    "arc_param1":              60,    # Canny upper threshold in HoughCircles
    "arc_param2":              18,    # accumulator — lower = more circles
    "arc_min_radius":          30,
    "arc_max_radius":          65,
    "arc_wall_tol":            18,    # arc centre must be ≤ this px from a wall

    # ── Window detection (gap scan along outer walls) ─────────────
    "window_scan_thresh":      150,   # pixel value BELOW which = wall/frame
    "window_gap_min_px":       15,    # shorter → noise
    "window_gap_max_px":       120,   # longer  → door opening
    "window_outer_tol":        5,     # px — how far inside the wall to scan

    # ── Output ────────────────────────────────────────────────────
    "normalize":               True,
    "parser_version":          "2.0.0",
}


# ══════════════════════════════════════════════════════════════════
# UTILITIES
# ══════════════════════════════════════════════════════════════════

def log(msg: str) -> None:
    """Write debug text to stderr — stdout is reserved for JSON."""
    print(f"[ASIS Parser] {msg}", file=sys.stderr)


def cluster_1d(values: list, tol: int) -> list:
    """
    Greedy 1-D clustering.
    [70,71,72,73,74,75] → [72]  (median of cluster)
    Groups consecutive values within `tol` of each other.
    Used to collapse the 8-10 parallel Hough segments a thick wall
    produces into a single canonical midline coordinate.
    """
    if not values:
        return []
    values = sorted(values)
    clusters, current = [], [values[0]]
    for v in values[1:]:
        if v - current[-1] <= tol:
            current.append(v)
        else:
            clusters.append(current)
            current = [v]
    clusters.append(current)
    return [int(np.median(c)) for c in clusters]


# ══════════════════════════════════════════════════════════════════
# STEP 1 — Load image
# ══════════════════════════════════════════════════════════════════

def load_image(path: str):
    """
    Returns (bgr, gray). Raises FileNotFoundError if cv2.imread fails.
    This is the only stage that raises — all others return empty lists
    on failure so the pipeline can always produce valid JSON.
    """
    bgr = cv2.imread(path)
    if bgr is None:
        raise FileNotFoundError(f"cv2.imread returned None for: {path}")
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    return bgr, gray


# ══════════════════════════════════════════════════════════════════
# STEP 2 — Wall mask
# ══════════════════════════════════════════════════════════════════

def build_wall_mask(gray: np.ndarray) -> np.ndarray:
    """
    Global threshold (gray < 50) isolates dark wall pixels precisely.
    Adaptive threshold is NOT used because the image is clean and digital —
    global threshold is faster and produces less noise on this image type.

    Morphological CLOSE (3×3, 2 iter):
      Seals 1-2 px anti-aliasing gaps along wall edges so that
      HoughLinesP sees one solid line rather than a dashed one.
    """
    mask = np.where(gray < CFG["wall_dark_thresh"], 255, 0).astype(np.uint8)
    k    = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k, iterations=2)
    return mask


# ══════════════════════════════════════════════════════════════════
# STEP 3 — Wall detection and classification
# ══════════════════════════════════════════════════════════════════

def detect_walls(mask: np.ndarray, img_w: int, img_h: int) -> list:
    """
    Pipeline:
      1. HoughLinesP → many overlapping segments per real wall (one per pixel row)
      2. Split into Horizontal (H) and Vertical (V) groups by dominant axis
      3. Cluster H segments by Y midpoint → one canonical Y per wall
         Cluster V segments by X midpoint → one canonical X per wall
      4. Per cluster: sweep all segments and take (min, max) along the
         length axis → wall extent

    WHY HoughLinesP over standard HoughLines:
      Returns actual endpoints (not infinite lines) — start/end coords
      are directly usable in Three.js BufferGeometry without extra math.

    WHY cluster instead of endpoint-merge:
      A 10-px thick wall at y≈77 fires segments at y=70,71,...,80.
      Clustering by median is O(n log n) and robust; endpoint merging
      is O(n²) and breaks when line ends don't overlap perfectly.

    Classification rules:
      load_bearing_outer : within 20 px of the bounding box of all walls
      load_bearing_spine : interior wall spanning > 40% of image dimension
      partition          : everything else

    Limitation: diagonal walls (non-0°/90°) are split between H and V
    buckets and appear as two short stubs rather than one diagonal.
    """
    raw = cv2.HoughLinesP(
        mask,
        CFG["hough_rho"],
        CFG["hough_theta"],
        CFG["hough_threshold"],
        minLineLength=CFG["hough_min_length"],
        maxLineGap=CFG["hough_max_gap"],
    )
    if raw is None:
        return []

    segs    = [tuple(map(int, l[0])) for l in raw]
    h_segs  = [(x1,y1,x2,y2) for x1,y1,x2,y2 in segs if abs(x2-x1) >= abs(y2-y1)]
    v_segs  = [(x1,y1,x2,y2) for x1,y1,x2,y2 in segs if abs(y2-y1)  > abs(x2-x1)]

    log(f"Hough segments: {len(segs)} raw → {len(h_segs)} H, {len(v_segs)} V")

    tol = CFG["cluster_tol_px"]

    def to_canonical(segments, coord_fn, extent_fn):
        if not segments:
            return []
        centers   = cluster_1d([coord_fn(s) for s in segments], tol)
        result    = []
        for c in centers:
            group   = [s for s in segments if abs(coord_fn(s) - c) <= tol]
            extents = [v for s in group for v in extent_fn(s)]
            result.append((int(c), int(min(extents)), int(max(extents))))
        return result

    h_canonical = to_canonical(
        h_segs,
        coord_fn  = lambda s: (s[1]+s[3]) / 2,  # midpoint Y
        extent_fn = lambda s: (s[0], s[2]),       # x1, x2
    )
    v_canonical = to_canonical(
        v_segs,
        coord_fn  = lambda s: (s[0]+s[2]) / 2,  # midpoint X
        extent_fn = lambda s: (s[1], s[3]),       # y1, y2
    )

    log(f"Canonical walls: {len(h_canonical)} H, {len(v_canonical)} V")

    # ── Build wall list ──────────────────────────────────────────
    walls  = []
    wid    = 1

    all_xs = ([x for _,xs,xe in h_canonical for x in (xs,xe)] +
              [x for x,_,_ in v_canonical])
    all_ys = ([y for y,_,_ in h_canonical] +
              [y for _,ys,ye in v_canonical for y in (ys,ye)])

    if not all_xs:
        return []

    bound_x_min, bound_x_max = min(all_xs), max(all_xs)
    bound_y_min, bound_y_max = min(all_ys), max(all_ys)
    btol = 20  # boundary tolerance px

    def classify(orientation, coord, length_px):
        """Three-tier classification: outer > spine > partition."""
        if orientation == "horizontal":
            is_outer = (abs(coord - bound_y_min) < btol or
                        abs(coord - bound_y_max) < btol)
            is_spine = length_px > 0.40 * img_w
        else:
            is_outer = (abs(coord - bound_x_min) < btol or
                        abs(coord - bound_x_max) < btol)
            is_spine = length_px > 0.40 * img_h

        if is_outer:
            return "load_bearing_outer"
        if is_spine:
            return "load_bearing_spine"
        return "partition"

    for (y, x_start, x_end) in h_canonical:
        length = x_end - x_start
        walls.append({
            "id":              f"w{wid}",
            "orientation":     "horizontal",
            "start":           [x_start, y],
            "end":             [x_end,   y],
            "length_px":       length,
            "structural_type": classify("horizontal", y, length),
        })
        wid += 1

    for (x, y_start, y_end) in v_canonical:
        length = y_end - y_start
        walls.append({
            "id":              f"w{wid}",
            "orientation":     "vertical",
            "start":           [x, y_start],
            "end":             [x, y_end],
            "length_px":       length,
            "structural_type": classify("vertical", x, length),
        })
        wid += 1

    return walls


# ══════════════════════════════════════════════════════════════════
# STEP 4 — Room detection  (grid-cell approach)
# ══════════════════════════════════════════════════════════════════

def detect_rooms(gray: np.ndarray, walls: list) -> list:
    """
    WHY NOT contours?
      On this image type, dilation to close door gaps merges all room
      contours into one large polygon. The cream fill colour is present
      in every room, so a range-threshold mask produces one connected
      blob rather than separate room regions.

    Grid-cell approach (correct for orthogonal plans):
      1. Extract the set of unique canonical Y values from H-walls,
         and unique canonical X values from V-walls.
      2. Treat adjacent pairs as a grid — each cell is a candidate room.
      3. Sample the center pixel of each cell in the original gray image.
      4. If the sample falls in the cream range (190-253), the cell
         is a room interior. If it's white (255) or wall-dark (<50), skip.
      5. Derive the polygon as the four corners of the cell.

      This is O(H×V) where H and V are the number of wall lines (typically
      3-6 each), not O(pixels), and is 100% robust to door-gap merging.

    Limitation: L-shaped rooms span multiple cells — they will appear as
    multiple room entries. Merging adjacent same-label cells is a Stage 2
    improvement (requires OCR-based room labelling first).
    """
    h_walls = sorted(set(
        int((w["start"][1] + w["end"][1]) / 2)
        for w in walls if w["orientation"] == "horizontal"
    ))
    v_walls = sorted(set(
        int((w["start"][0] + w["end"][0]) / 2)
        for w in walls if w["orientation"] == "vertical"
    ))

    if len(h_walls) < 2 or len(v_walls) < 2:
        return []

    half = CFG["wall_half_thickness"]
    rooms = []
    rid   = 1

    for i in range(len(h_walls) - 1):
        y_top = h_walls[i]     + half
        y_bot = h_walls[i + 1] - half
        if y_bot - y_top < 20:
            continue

        for j in range(len(v_walls) - 1):
            x_left  = v_walls[j]     + half
            x_right = v_walls[j + 1] - half
            if x_right - x_left < 20:
                continue

            cx = (x_left + x_right) // 2
            cy = (y_top  + y_bot)   // 2

            # Clamp to image bounds
            h_img, w_img = gray.shape
            if not (0 <= cx < w_img and 0 <= cy < h_img):
                continue

            sample = int(gray[cy, cx])

            if not (CFG["room_fill_min"] < sample < CFG["room_fill_max"]):
                continue  # white background or wall pixel — skip

            area_px = (x_right - x_left) * (y_bot - y_top)
            if area_px < CFG["room_min_area_px"]:
                continue

            # Four corners of the cell (clockwise from top-left)
            polygon = [
                [x_left,  y_top],
                [x_right, y_top],
                [x_right, y_bot],
                [x_left,  y_bot],
            ]

            rooms.append({
                "id":       f"r{rid}",
                "polygon":  polygon,
                "centroid": [cx, cy],
                "area_px":  area_px,
                "bbox":     [x_left, y_top, x_right, y_bot],
                "label":    None,   # filled by OCR / label-assignment layer
            })
            rid += 1

    # Sort largest first
    rooms.sort(key=lambda r: r["area_px"], reverse=True)
    return rooms


# ══════════════════════════════════════════════════════════════════
# STEP 5 — Opening detection  (doors + windows)
# ══════════════════════════════════════════════════════════════════

def _canonical_wall_coords(walls: list) -> tuple:
    """Return (h_ys, v_xs) — the canonical wall line positions."""
    h_ys = sorted(set(
        int((w["start"][1] + w["end"][1]) / 2)
        for w in walls if w["orientation"] == "horizontal"
    ))
    v_xs = sorted(set(
        int((w["start"][0] + w["end"][0]) / 2)
        for w in walls if w["orientation"] == "vertical"
    ))
    return h_ys, v_xs


def detect_doors(gray: np.ndarray, walls: list) -> list:
    """
    Strategy: HoughCircles on a Canny edge image, filtered by wall proximity.

    WHY Canny first?
      HoughCircles on raw grayscale at param2=22 produces 241+ false
      positives on this image (confirmed empirically — see analysis notes).
      Running it on Canny edges reduces voting to actual edge pixels only,
      cutting false positives from 241 to ~17 before the proximity filter.

    WHY wall-proximity filter?
      Real door arcs in a floor plan have their CENTRE at a wall junction
      (the hinge point). False positives from text, scale bars, and image
      borders have centres far from any wall.
      Filter: arc centre must be within arc_wall_tol px of a known wall.

    Proximity check implementation:
      Rather than building a pixel-set (slow for large tolerances), check
      each circle centre against the list of canonical wall coordinates
      directly — O(circles × walls), not O(image_pixels).

    Limitation: quarter-arc swings have weaker Hough votes than full
    circles. param2=18 is low to catch them — the wall-proximity filter
    is what makes this safe at low param2.
    """
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges   = cv2.Canny(blurred, CFG["arc_canny_low"], CFG["arc_canny_high"])

    circles = cv2.HoughCircles(
        edges,
        cv2.HOUGH_GRADIENT,
        dp        = CFG["arc_dp"],
        minDist   = CFG["arc_min_dist"],
        param1    = CFG["arc_param1"],
        param2    = CFG["arc_param2"],
        minRadius = CFG["arc_min_radius"],
        maxRadius = CFG["arc_max_radius"],
    )

    if circles is None:
        return []

    h_ys, v_xs = _canonical_wall_coords(walls)
    tol         = CFG["arc_wall_tol"]
    doors       = []
    did         = 1

    for (cx, cy, r) in np.round(circles[0]).astype(int):
        near_h = any(abs(cy - yw) <= tol for yw in h_ys)
        near_v = any(abs(cx - xw) <= tol for xw in v_xs)

        if not (near_h or near_v):
            continue  # not near any wall → discard

        doors.append({
            "id":        f"door{did}",
            "type":      "door",
            "position":  [int(cx), int(cy)],
            "radius_px": int(r),
            "source":    "arc",
        })
        did += 1

    return doors


def detect_windows(gray: np.ndarray, walls: list) -> list:
    """
    Strategy: scan along each wall segment looking for gaps.

    WHY scan threshold=150 (not 50)?
      Windows in this image type have a thin interior frame line (~gray 84-108)
      that sits inside a wider opening (~gray 255 between the frames).
      Using threshold=50 misses the window entirely because the frame pixels
      read as a wall pixel and the "gap" appears to be only 1-2 px wide.
      Using threshold=150 treats the frame lines as "not a solid wall",
      so the entire window opening (frame-to-frame) registers as a gap.
      Confirmed from pixel analysis: top-wall window at x=131-238 has
      gray[77, 184]=84 (frame line), gray[77, 160]=255 (opening between frames).

    Gap classification:
      window_gap_min_px  (15) < gap_len ≤ window_gap_max_px (120)  → window
      gap_len > window_gap_max_px                                   → door
    """
    windows  = []
    wnd_id   = 1
    h_img, w_img = gray.shape

    for wall in walls:
        x1, y1 = wall["start"]
        x2, y2 = wall["end"]
        length  = math.hypot(x2 - x1, y2 - y1)
        if length < 20:
            continue

        steps     = int(length)
        in_gap    = False
        gap_start = 0

        for step in range(steps + 1):
            t  = step / max(steps, 1)
            px = int(round(x1 + t * (x2 - x1)))
            py = int(round(y1 + t * (y2 - y1)))

            if not (0 <= px < w_img and 0 <= py < h_img):
                continue

            is_solid = gray[py, px] < CFG["window_scan_thresh"]

            if not is_solid:
                if not in_gap:
                    in_gap    = True
                    gap_start = step
            else:
                if in_gap:
                    gap_len = step - gap_start
                    if gap_len >= CFG["window_gap_min_px"]:
                        mid_t = (gap_start + gap_len / 2) / max(steps, 1)
                        mx    = int(round(x1 + mid_t * (x2 - x1)))
                        my    = int(round(y1 + mid_t * (y2 - y1)))

                        w_type = ("window" if gap_len <= CFG["window_gap_max_px"]
                                  else "door")

                        windows.append({
                            "id":       f"window{wnd_id}",
                            "type":     w_type,
                            "position": [mx, my],
                            "width_px": gap_len,
                            "wall_id":  wall["id"],
                            "source":   "gap",
                        })
                        wnd_id += 1
                    in_gap = False

    return windows


def detect_openings(gray: np.ndarray, walls: list) -> list:
    """
    Merge door arcs and window gap results, de-duplicate overlapping
    detections (an arc and a gap detection at the same position), and
    assign final sequential IDs.

    De-duplication: if an arc-detected door and a gap-detected door are
    within 40 px of each other, prefer the arc (more precise position).
    """
    doors   = detect_doors(gray, walls)
    windows = detect_windows(gray, walls)

    # Remove gap-detected doors that coincide with arc-detected doors
    dedup_radius_sq = 40 ** 2

    def too_close_to_arc(win, arc_doors):
        wx, wy = win["position"]
        for d in arc_doors:
            dx, dy = d["position"]
            if (wx - dx) ** 2 + (wy - dy) ** 2 < dedup_radius_sq:
                return True
        return False

    arc_doors   = [d for d in doors]
    gap_entries = [w for w in windows if not too_close_to_arc(w, arc_doors)]

    merged = arc_doors + gap_entries

    # Re-ID sequentially
    for i, item in enumerate(merged, start=1):
        item["id"] = f"o{i}"

    log(f"Arc-detected openings: {len(arc_doors)}")
    log(f"Gap-detected openings (after dedup): {len(gap_entries)}")

    return merged


# ══════════════════════════════════════════════════════════════════
# STEP 6 — Coordinate normalisation
# ══════════════════════════════════════════════════════════════════

def normalize_output(data: dict, img_w: int, img_h: int) -> dict:
    """
    Convert all pixel coordinates to [0.0, 1.0] float space.
    x → x / img_w,  y → y / img_h   (4 decimal places)
    Opening widths are normalised by the image diagonal so they
    remain dimensionally consistent regardless of wall orientation.

    Three.js usage:
      const realWidthM  = 12.0;  // from scale bar or user input
      const realHeightM = 9.0;
      const x_m = normalised_x * realWidthM;
      const y_m = normalised_y * realHeightM;
    """
    def np_(pt):
        return [round(pt[0] / img_w, 4), round(pt[1] / img_h, 4)]

    max_dim = max(img_w, img_h)  # for scalar dimensions (radii, widths)

    for w in data["walls"]:
        w["start"] = np_(w["start"])
        w["end"]   = np_(w["end"])
        del w["length_px"]

    for r in data["rooms"]:
        r["polygon"]  = [np_(p)  for p in r["polygon"]]
        r["centroid"] = np_(r["centroid"])
        r["bbox"]     = [round(r["bbox"][0]/img_w, 4), round(r["bbox"][1]/img_h, 4),
                         round(r["bbox"][2]/img_w, 4), round(r["bbox"][3]/img_h, 4)]
        # area_normalized: fraction of total image area
        r["area_normalized"] = round(r.pop("area_px") / (img_w * img_h), 6)

    for o in data["openings"]:
        o["position"] = np_(o["position"])
        if "radius_px" in o:
            o["radius_px"] = round(o["radius_px"] / max_dim, 4)
        if "width_px" in o:
            o["width_px"]  = round(o["width_px"]  / max_dim, 4)

    return data


# ══════════════════════════════════════════════════════════════════
# STEP 7 — Material assignment
# ══════════════════════════════════════════════════════════════════

MATERIAL_MAP = {
    "load_bearing_outer": {
        "options":     ["RCC", "Red Brick"],
        "recommended": "RCC",
        "color_hex":   "#8B5E3C",    # brick-red — used as default Three.js mesh colour
        "score": {"strength": 9, "durability": 9, "cost": 8},
    },
    "load_bearing_spine": {
        "options":     ["RCC", "Red Brick", "Hollow Block"],
        "recommended": "RCC",
        "color_hex":   "#A0714F",
        "score": {"strength": 9, "durability": 8, "cost": 7},
    },
    "partition": {
        "options":     ["AAC Block", "Fly Ash Brick", "Gypsum Board"],
        "recommended": "AAC Block",
        "color_hex":   "#D4C5A9",    # light cream — partition walls
        "score": {"strength": 5, "durability": 7, "cost": 3},
    },
}


def assign_materials(walls: list) -> list:
    """
    Apply rule-based material recommendations.

    Scoring formula (from summary.txt):
      score = strength + durability - cost
    Weights differ by wall type — load-bearing maximises
    strength/durability; partitions minimise cost.

    Returned list is parallel to `walls` (same order, same IDs)
    and can be indexed directly in the Three.js material loop.
    """
    materials = []
    for w in walls:
        mat = MATERIAL_MAP.get(w["structural_type"], MATERIAL_MAP["partition"])
        net_score = (mat["score"]["strength"]
                     + mat["score"]["durability"]
                     - mat["score"]["cost"])
        materials.append({
            "wallId":          w["id"],
            "structural_type": w["structural_type"],
            "options":         mat["options"],
            "recommended":     mat["recommended"],
            "color_hex":       mat["color_hex"],
            "score":           mat["score"],
            "net_score":       net_score,
        })
    return materials


# ══════════════════════════════════════════════════════════════════
# STEP 8 — Structural flags
# ══════════════════════════════════════════════════════════════════

def generate_structural_flags(walls: list, rooms: list, openings: list) -> list:
    """
    Deterministic rule set that surfaces structural concerns.
    Severity levels: "critical" | "warning" | "info"

    The flag list is consumed by the frontend's
    `structuralFlags` display panel (frontend_PRD.md §3.4).
    """
    flags = []

    if not walls:
        flags.append({
            "code":     "NO_WALLS_DETECTED",
            "severity": "critical",
            "message":  "No walls detected. Check image quality and contrast.",
        })
        return flags

    outer  = [w for w in walls if w["structural_type"] == "load_bearing_outer"]
    spine  = [w for w in walls if w["structural_type"] == "load_bearing_spine"]
    parts  = [w for w in walls if w["structural_type"] == "partition"]
    doors  = [o for o in openings if o["type"] == "door"]
    wins   = [o for o in openings if o["type"] == "window"]

    if len(outer) < 2:
        flags.append({
            "code":     "FEW_OUTER_WALLS",
            "severity": "warning",
            "message":  (
                f"Only {len(outer)} load-bearing outer wall(s) detected. "
                "Expected at least 2 pairs for a closed perimeter."
            ),
        })

    if not rooms:
        flags.append({
            "code":     "NO_ENCLOSED_ROOMS",
            "severity": "warning",
            "message":  "No enclosed room cells detected. Walls may not form closed polygons.",
        })

    if not doors:
        flags.append({
            "code":     "NO_DOORS_DETECTED",
            "severity": "info",
            "message":  "No door openings detected. Building entrance may be absent or undetected.",
        })

    if not wins:
        flags.append({
            "code":     "NO_WINDOWS_DETECTED",
            "severity": "info",
            "message":  "No window openings detected. Natural light / ventilation may be absent.",
        })

    if outer and not spine and len(parts) > 4:
        flags.append({
            "code":     "NO_SPINE_WALLS",
            "severity": "warning",
            "message":  (
                f"{len(parts)} partition walls detected but no load-bearing spine walls. "
                "Large unsupported spans may exceed structural limits."
            ),
        })

    if len(rooms) > 0 and len(doors) > 0:
        # Sanity: at least 1 door per 3 rooms is expected
        if len(doors) < max(1, len(rooms) // 3):
            flags.append({
                "code":     "LOW_DOOR_TO_ROOM_RATIO",
                "severity": "info",
                "message":  (
                    f"{len(doors)} door(s) for {len(rooms)} room(s) detected. "
                    "Some rooms may be inaccessible."
                ),
            })

    log(f"Structural flags: {len(flags)}")
    return flags


# ══════════════════════════════════════════════════════════════════
# STEP 9 — Three.js scene JSON
# ══════════════════════════════════════════════════════════════════

def generate_scene_json(data: dict) -> dict:
    """
    Convert normalised parser output into a Three.js-ready scene.

    ┌─────────────────────────────────────────────────────────────┐
    │  Coordinate mapping                                         │
    │    Floor plan X  →  Three.js +X  (right)                   │
    │    Floor plan Y  →  Three.js +Z  (into scene / depth)      │
    │    Wall height   →  Three.js +Y  (up)                      │
    │                                                             │
    │  All spatial values are in normalised [0, 1] space.        │
    │  Multiply before building geometry:                         │
    │    x  *=  realWidthM   (e.g. 12.0)                        │
    │    z  *=  realDepthM   (e.g. 9.0)                         │
    │    y  *=  wallHeightM  (e.g. 3.0)                         │
    └─────────────────────────────────────────────────────────────┘

    Three.js usage example
    ──────────────────────
    sceneJson.walls.forEach(w => {
      const geo = new THREE.BoxGeometry(
        w.geometry.width  * realWidthM,
        w.geometry.height * wallHeightM,
        w.geometry.depth  * realDepthM
      );
      // material colour from w.material_color_hex
      const mat = new THREE.MeshStandardMaterial({ color: w.material_color_hex });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        w.position[0] * realWidthM,
        w.position[1] * wallHeightM,
        w.position[2] * realDepthM
      );
      mesh.rotation.y = w.rotation_y;   // already in radians
      scene.add(mesh);
    });

    sceneJson.rooms.forEach(r => {
      const shape = new THREE.Shape();
      r.geometry.vertices.forEach(([x,_,z], i) => {
        const rx = x * realWidthM, rz = z * realDepthM;
        i === 0 ? shape.moveTo(rx, rz) : shape.lineTo(rx, rz);
      });
      const geo  = new THREE.ShapeGeometry(shape);
      const mesh = new THREE.Mesh(geo, floorMat);
      mesh.rotation.x = -Math.PI / 2;  // rotate into XZ plane
      scene.add(mesh);
    });
    """
    # ── Normalised constants ──────────────────────────────────────
    WALL_HEIGHT    = 1.0     # multiply by real height   (e.g. 3.0 m)
    WALL_THICKNESS = 0.015   # multiply by real height   (~15 cm on 10 m plan)
    DOOR_HEIGHT    = 0.733   # ~2.2 m / 3.0 m  wall
    WINDOW_SILL    = 0.333   # ~1.0 m / 3.0 m
    WINDOW_TOP     = 0.833   # ~2.5 m / 3.0 m

    # Build a wallId → material colour lookup
    mat_lookup = {}
    for m in data.get("materials", []):
        mat_lookup[m["wallId"]] = m["color_hex"]

    # ── Walls ────────────────────────────────────────────────────
    scene_walls = []
    for w in data["walls"]:
        x1, y1 = w["start"]
        x2, y2 = w["end"]
        cx     = round((x1 + x2) / 2, 4)
        cz     = round((y1 + y2) / 2, 4)   # floor-plan Y → Three.js Z
        length = round(math.hypot(x2 - x1, y2 - y1), 4)
        rot_y  = 0.0 if w["orientation"] == "horizontal" else round(math.pi / 2, 6)

        scene_walls.append({
            "id":              w["id"],
            "structural_type": w["structural_type"],
            "orientation":     w["orientation"],
            # BoxGeometry dims (all normalised, multiply by real dims before use)
            "geometry": {
                "type":   "BoxGeometry",
                "width":  length,          # along wall axis
                "height": WALL_HEIGHT,     # vertical (Y)
                "depth":  WALL_THICKNESS,  # wall thickness
            },
            # mesh.position.set(pos[0]*W, pos[1]*H, pos[2]*D)
            "position":  [cx, round(WALL_HEIGHT / 2, 4), cz],
            # mesh.rotation.y = rotation_y
            "rotation_y":       rot_y,
            "material_color_hex": mat_lookup.get(w["id"], "#888888"),
        })

    # ── Room floor planes ────────────────────────────────────────
    scene_rooms = []
    for r in data["rooms"]:
        # Polygon vertices mapped into the XZ plane (Y = 0 = floor level).
        # Three.js: build a THREE.Shape from (x, z), then rotate -PI/2 on X.
        verts_xz = [[p[0], 0.0, p[1]] for p in r["polygon"]]
        cx_r, cy_r = r["centroid"]
        scene_rooms.append({
            "id":    r["id"],
            "label": r.get("label"),
            "geometry": {
                "type":     "ShapeGeometry",
                # vertices: [x, 0, z] — use (v[0], v[2]) for THREE.Shape points
                "vertices": verts_xz,
            },
            "centroid":       [cx_r, 0.0, cy_r],   # floor centre
            "area_normalized": r.get("area_normalized", 0),
        })

    # ── Openings (doors + windows) ───────────────────────────────
    scene_openings = []
    for o in data["openings"]:
        px, pz = o["position"]
        entry = {
            "id":      o["id"],
            "type":    o["type"],
            "wall_id": o.get("wall_id"),
            "source":  o.get("source"),
            # Base-centre of the opening on the wall surface
            # position[1] = height_start (normalised)
            "position": [round(px, 4), 0.0, round(pz, 4)],
        }
        if o["type"] == "door":
            entry["height_start"] = 0.0
            entry["height_end"]   = DOOR_HEIGHT
            # arc-detected doors use radius as half-width
            entry["width"] = round(o.get("radius_px", o.get("width_px", 0)) * 2, 4)
        else:  # window
            entry["height_start"] = WINDOW_SILL
            entry["height_end"]   = WINDOW_TOP
            entry["width"] = round(o.get("width_px", 0), 4)
        scene_openings.append(entry)

    return {
        "walls":    scene_walls,
        "rooms":    scene_rooms,
        "openings": scene_openings,
        "constants": {
            "description": (
                "Multiply all spatial values by the corresponding real dimensions "
                "before passing to Three.js geometry constructors."
            ),
            "coordinate_system": {
                "x_axis": "floor_plan_X  →  Three.js +X (right)",
                "y_axis": "wall_height   →  Three.js +Y (up)",
                "z_axis": "floor_plan_Y  →  Three.js +Z (depth)",
            },
            "normalised_values": {
                "wall_height":    WALL_HEIGHT,
                "wall_thickness": WALL_THICKNESS,
                "door_height":    DOOR_HEIGHT,
                "window_sill":    WINDOW_SILL,
                "window_top":     WINDOW_TOP,
            },
            "usage": {
                "x": "value * realWidthM",
                "y": "value * wallHeightM  (default 3.0)",
                "z": "value * realDepthM",
            },
        },
    }


# ══════════════════════════════════════════════════════════════════
# MAIN PIPELINE ORCHESTRATOR
# ══════════════════════════════════════════════════════════════════

def parse_floor_plan(image_path: str) -> dict:
    """
    Full 9-stage pipeline:
      01  Load image
      02  Build wall mask
      03  Detect walls (HoughLinesP + clustering + classification)
      04  Detect rooms (grid-cell approach)
      05  Detect openings (HoughCircles + gap scan + dedup)
      06  Coordinate normalisation → [0, 1]
      07  Material assignment (rule-based)
      08  Structural flags (rule-based warnings)
      09  Three.js scene JSON generation

    Each of stages 03-05 is wrapped in try/except so a failure in room
    or opening detection never kills the wall output — Three.js can
    extrude walls alone if rooms/openings are empty.
    """
    bgr, gray = load_image(image_path)
    img_h, img_w = gray.shape

    log(f"Loaded {img_w}×{img_h}px  ← {image_path}")

    wall_mask = build_wall_mask(gray)

    # ── Stage 03: Walls ──────────────────────────────────────────
    walls = []
    try:
        walls = detect_walls(wall_mask, img_w, img_h)
        lb    = sum(1 for w in walls if "load_bearing" in w["structural_type"])
        log(f"Walls: {len(walls)} total, {lb} load-bearing")
    except Exception as exc:
        log(f"WARN wall detection failed: {exc}")

    # ── Stage 04: Rooms ──────────────────────────────────────────
    rooms = []
    try:
        rooms = detect_rooms(gray, walls)
        log(f"Rooms: {len(rooms)} detected")
    except Exception as exc:
        log(f"WARN room detection failed: {exc}")

    # ── Stage 05: Openings ───────────────────────────────────────
    openings = []
    try:
        openings = detect_openings(gray, walls)
        n_doors   = sum(1 for o in openings if o["type"] == "door")
        n_windows = sum(1 for o in openings if o["type"] == "window")
        log(f"Openings: {n_doors} doors, {n_windows} windows")
    except Exception as exc:
        log(f"WARN opening detection failed: {exc}")

    # ── Stage 07: Materials (before normalise — uses structural_type only) ──
    materials = []
    try:
        materials = assign_materials(walls)
        log(f"Materials assigned for {len(materials)} walls")
    except Exception as exc:
        log(f"WARN material assignment failed: {exc}")

    # ── Stage 08: Structural flags ───────────────────────────────
    structural_flags = []
    try:
        structural_flags = generate_structural_flags(walls, rooms, openings)
        log(f"Structural flags: {len(structural_flags)}")
    except Exception as exc:
        log(f"WARN structural flag generation failed: {exc}")

    result = {
        "walls":           walls,
        "rooms":           rooms,
        "openings":        openings,
        "materials":       materials,
        "structuralFlags": structural_flags,
        "meta": {
            "image_width_px":  img_w,
            "image_height_px": img_h,
            "wall_count":      len(walls),
            "room_count":      len(rooms),
            "opening_count":   len(openings),
            "normalized":      CFG["normalize"],
            "parser_version":  CFG["parser_version"],
        },
    }

    # ── Stage 06: Normalise ──────────────────────────────────────
    if CFG["normalize"]:
        result = normalize_output(result, img_w, img_h)

    # ── Stage 09: Three.js scene JSON (after normalise) ──────────
    try:
        result["sceneJson"] = generate_scene_json(result)
        log(f"sceneJson generated: {len(result['sceneJson']['walls'])} walls, "
            f"{len(result['sceneJson']['rooms'])} rooms, "
            f"{len(result['sceneJson']['openings'])} openings")
    except Exception as exc:
        log(f"WARN sceneJson generation failed: {exc}")
        result["sceneJson"] = {"walls": [], "rooms": [], "openings": [], "constants": {}}

    return result


# ══════════════════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════════════════

def main() -> None:
    """
    stdout = JSON only.  stderr = debug logs.
    Exit 1 on fatal error — caller checks exit code before JSON.parse().
    """
    if len(sys.argv) < 2:
        print(json.dumps({
            "error":    "Usage: python3 parser.py <image_path>",
            "walls":    [],
            "rooms":    [],
            "openings": [],
        }))
        sys.exit(1)

    try:
        result = parse_floor_plan(sys.argv[1])
        print(json.dumps(result, indent=2))

    except FileNotFoundError as exc:
        print(json.dumps({
            "error":    str(exc),
            "walls":    [],
            "rooms":    [],
            "openings": [],
        }))
        sys.exit(1)

    except Exception as exc:
        print(json.dumps({
            "error":    f"Unexpected parser failure: {str(exc)}",
            "walls":    [],
            "rooms":    [],
            "openings": [],
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()