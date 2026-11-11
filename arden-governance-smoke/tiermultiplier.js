
const { chromium } = require("@playwright/test");

const URL = "https://qa.sotto.li/";
const EXPECTED_TIERS = {
  Seed: {
    loyaltyBonus: 1.0,
    liquidityRewards: 1.7,
    votingPower: 0,
  },
  Sprout: {
    loyaltyBonus: 1.1,
    liquidityRewards: 1.8,
    votingPower: 1,
  },
  Grower: {
    loyaltyBonus: 1.2,
    liquidityRewards: 1.9,
    votingPower: 2,
  },
  Harvester: {
    loyaltyBonus: 1.3,
    liquidityRewards: 2.0,
    votingPower: 3,
  },
  Guardian: {
    loyaltyBonus: 1.3,
    liquidityRewards: 2.0,
    votingPower: 5,
  },
  Council: {
    loyaltyBonus: 1.3,
    liquidityRewards: 2.0,
    votingPower: 5,
  },
};

async function main() {
  let browser;

  try {
    browser = await chromium.connectOverCDP(
      "http://127.0.0.1:9222",
      { timeout: 15000 }
    );

    const context = browser.contexts()[0];
    const page = context.pages()[0] || await context.newPage();

    console.log("\n========================================");
    console.log(" ARDEN TIER MULTIPLIER DOWNGRADE TEST");
    console.log("========================================");

    await page.goto(URL, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForTimeout(3000);

    console.log("URL:", page.url());
    console.log("Title:", await page.title());

    console.log("\nEXPECTED MULTIPLIER MATRIX");
    console.table(
      Object.entries(EXPECTED_TIERS).map(([tier, values]) => ({
        tier,
        loyaltyBonus: `${values.loyaltyBonus.toFixed(1)}x`,
        liquidityRewards: `${values.liquidityRewards.toFixed(1)}x`,
        votingPower: values.votingPower,
      }))
    );

    // Read visible page text without changing any wallet or contract state.
    const visibleText = await page.locator("body").innerText()
      .catch(() => "");

    const keywords = [
      "Seed", "Sprout", "Grower", "Harvester",
      "Guardian", "Council", "loyalty",
      "liquidity", "multiplier", "voting power",
    ];

    console.log("\nVISIBLE TIER-RELATED PAGE TEXT");
    const lines = visibleText
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean);

    const matches = lines.filter(line =>
      keywords.some(word =>
        line.toLowerCase().includes(word.toLowerCase())
      )
    );

    if (matches.length) {
      console.log(matches.join("\n"));
    } else {
      console.log("No tier/multiplier labels found on the current page.");
      console.log("Open the ARDEN page that displays the user's tier.");
    }

    await page.screenshot({
      path: "tier-multiplier-inspection.png",
      fullPage: true,
    });

    console.log("\nScreenshot saved: tier-multiplier-inspection.png");
    console.log("\nRESULT: INSPECTION ONLY");
    console.log(
      "Actual downgrade and multiplier assertions are not yet performed."
    );
    console.log(
      "The script needs the tier-change action and actual UI labels or contract getters."
    );
  } catch (error) {
    console.error("\nTEST ERROR:", error.message);
    process.exitCode = 1;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

main();
