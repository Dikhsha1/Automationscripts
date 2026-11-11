import { Wallet } from "ethers";
import fs from "fs";

const TOTAL_WALLETS = 15;

const wallets = [];

for (let i = 1; i <= TOTAL_WALLETS; i++) {
    const wallet = Wallet.createRandom();

    wallets.push({
        level: i,
        username: `user${String(i).padStart(2, "0")}`,
        address: wallet.address,
        privateKey: wallet.privateKey
    });

    console.log(`Level ${i}`);
    console.log(`Username : user${String(i).padStart(2, "0")}`);
    console.log(`Address  : ${wallet.address}`);
    console.log(`Private  : ${wallet.privateKey}`);
    console.log("----------------------------------------");
}

fs.writeFileSync(
    "wallets.json",
    JSON.stringify(wallets, null, 2)
);

console.log(`\n${TOTAL_WALLETS} wallets saved to wallets.json`);