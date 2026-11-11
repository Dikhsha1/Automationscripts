import "dotenv/config";
import { createPublicClient, http } from "viem";

const client = createPublicClient({
  transport: http(process.env.RPC_URL),
});

try {
  const result = await client.request({
    method: "evm_increaseTime",
    params: [1800],
  });

  console.log("✅ evm_increaseTime supported");
  console.log("Result:", result);

} catch (error) {
  console.log("❌ evm_increaseTime NOT supported");
  console.log(error.message);
}