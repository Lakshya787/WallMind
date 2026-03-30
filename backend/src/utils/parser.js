import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

// Resolve parser.py relative to this file: src/utils/parser.js → ../../parser.py
const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const PARSER_PATH = path.resolve(__dirname, "../../parser.py");

export const runParser = (imagePath) => {
  return new Promise((resolve, reject) => {
    const pyCmd = process.env.PYTHON_CMD || "python";
    const py = spawn(pyCmd, [PARSER_PATH, imagePath]);

    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (data) => { stdout += data.toString(); });
    py.stderr.on("data", (data) => { stderr += data.toString(); });

    py.on("close", (code) => {
      // Log parser debug output (goes to stderr)
      if (stderr) console.log("[Parser stderr]", stderr.slice(-800));

      try {
        if (!stdout.trim()) {
          return reject(new Error(`Parser produced no output. Exit code: ${code}. Stderr: ${stderr.slice(-300)}`));
        }
        const result = JSON.parse(stdout);
        if (result.error) return reject(new Error(result.error));
        resolve(result);
      } catch (e) {
        reject(new Error(`JSON parse failed. Exit: ${code}. Stderr: ${stderr.slice(-300)}`));
      }
    });

    py.on("error", (err) => {
      reject(new Error(`Failed to spawn python: ${err.message}`));
    });
  });
};