import { app } from "./app";
import { env } from "./config/env";
import "./config/firebase";

app.listen(env.PORT, () => {
  console.log(`🚀 Server running on port ${env.PORT}`);
  console.log("🔥 Firebase Admin initialized");
});