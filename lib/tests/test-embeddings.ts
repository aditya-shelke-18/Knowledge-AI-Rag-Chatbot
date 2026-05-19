import "dotenv/config";
import { testEmbeddingGeneration } from "../ai/embedding";

testEmbeddingGeneration()
  .then((result) => console.log("Test completed successfully"))
  .catch((error) => console.error("Test failed:", error)); 