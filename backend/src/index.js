import "dotenv/config";  // MUST be first line. No code above this.

import connectDB from "./db/index.js";
import { app } from "./app.js";

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000,"0.0.0.0", () => {
      console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
      
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
  });