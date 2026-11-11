async function getDipikaUser() {
  console.log("→ calling referralCodeToUserId...");
  const result1 = await publicClient.readContract({
    address: USER_REGISTRY_ADDRESS,
    abi: USER_REGISTRY_ABI,
    functionName: "referralCodeToUserId",
    args: [REFERRER],
  });
  console.log("✓ referralCodeToUserId OK:", result1);

const [userId, active] = result1;

  console.log("→ calling getUserById...");
  const user = await publicClient.readContract({
    address: USER_REGISTRY_ADDRESS,
    abi: USER_REGISTRY_ABI,
    functionName: "getUserById",
    args: [userId],
  });
  console.log("✓ getUserById OK:", user);
  // ...
}