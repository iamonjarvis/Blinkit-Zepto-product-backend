const express = require("express");
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 3000; // Use Render's provided port


app.use(bodyParser.json());
app.use(express.static("public"));

// ----------------------
// Zepto scraper function
async function scrapeZepto(product) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 850, height: 650 });
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36");

  await page.goto("https://www.zeptonow.com/", { waitUntil: "networkidle2" });
  const searchAnchorSelector = 'a[aria-label="Search for products"]';
  await page.waitForSelector(searchAnchorSelector, { timeout: 10000 });
  await page.click(searchAnchorSelector);
  await page.waitForNavigation({ waitUntil: "networkidle2" });

  const searchInputSelector = 'input[placeholder*="Search for over"]';
  await page.waitForSelector(searchInputSelector, { timeout: 10000 });
  await page.type(searchInputSelector, product, { delay: 50 });
  await page.keyboard.press("Enter");
  await page.waitForSelector('a[data-testid="product-card"]', { timeout: 30000 });

  const zeptoProducts = await page.evaluate(() => {
    const elems = Array.from(document.querySelectorAll('a[data-testid="product-card"]'));
    return elems.slice(0, 10).map(elem => {
      const name = elem.querySelector('[data-testid="product-card-name"]')?.innerText.trim() || "No name";
      const price = elem.querySelector('[data-testid="product-card-price"]')?.innerText.trim() || "No price";
      const image = elem.querySelector('[data-testid="product-card-image"]')?.src || "";
      const weight = elem.querySelector('[data-testid="product-card-quantity"] h5')?.innerText.trim() || "";
      return { name, price, image, weight };
    });
  });

  await browser.close();
  return zeptoProducts;
}

// ----------------------
// Blinkit scraper function
async function scrapeBlinkit(location, product) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 850, height: 650 });
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36");
  const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // 1. Navigate to Blinkit homepage.
  await page.goto("https://blinkit.com/", { waitUntil: "networkidle2" });
  await waitFor(1500);

  // 2. Close the initial slider if present.
  const closeSliderSelector = 'div.DownloadAppModal__BackButtonIcon-sc-1wef47t-14';
  try {
    await page.waitForSelector(closeSliderSelector, { timeout: 5000 });
    await page.click(closeSliderSelector);
    await waitFor(1500);
  } catch (err) {
    console.log("Slider not present, continuing...");
  }

  // 3. Click "Select manually" in the location modal.
  const selectManuallySelector = 'div.GetLocationModal__SelectManually-sc-jc7b49-7';
  await page.waitForSelector(selectManuallySelector, { timeout: 10000 });
  await page.click(selectManuallySelector);
  await waitFor(1500);

  // 4. Type the saved location into the location input.
  const locationInputSelector = 'input[name="select-locality"][placeholder="search delivery location"]';
  await page.waitForSelector(locationInputSelector, { timeout: 10000 });
  await page.click(locationInputSelector);
  await page.type(locationInputSelector, location, { delay: 50 });
  // Remove last two characters to trigger suggestions.
  await waitFor(1000);
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await waitFor(1500);

  // 5. Click the first address result.
  const addressResultSelector = 'div.LocationSearchList__LocationListContainer-sc-93rfr7-0.lcVvPT';
  await page.waitForSelector(addressResultSelector, { timeout: 10000 });
  await page.click(`${addressResultSelector} > div`);
  await waitFor(1500);

  // (Skipping the confirm button step as per your updated request)

  // 6. Click the search bar's animation wrapper to open the modal search.
  const searchBarAnimationSelector = 'div.SearchBar__AnimationWrapper-sc-16lps2d-1.iJnYYS';
  await page.waitForSelector(searchBarAnimationSelector, { timeout: 10000 });
  await page.click(searchBarAnimationSelector);
  await waitFor(1500);

  // 7. Wait for the modal search input to appear, then type the product query.
  const searchInputSelector = 'input[placeholder*="Search"]';
  await page.waitForSelector(searchInputSelector, { timeout: 10000 });
  await page.type(searchInputSelector, product, { delay: 50 });
  await page.keyboard.press("Enter");
  await waitFor(2000);

  // 8. Wait for the product grid to load.
  const gridSelector = 'div[data-pf="reset"][style*="grid-column: span 6"]';
  await page.waitForSelector(gridSelector, { timeout: 30000 });
  await waitFor(1500);

  // 9. Extract details from the first 10 product cards.
  const blinkitProducts = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div[data-pf="reset"][style*="grid-column: span 6"]'));
    return cards.slice(0, 10).map(card => {
      const imageElem = card.querySelector('div.tw-overflow-hidden img');
      const nameElem = card.querySelector('div.tw-text-300.tw-font-semibold.tw-line-clamp-2') ||
                       card.querySelector('div.Product__UpdatedTitle-sc-11dk8zk-9');
      const weightElem = card.querySelector('div.tw-text-200.tw-font-medium.tw-line-clamp-1');
      let price = "No price";
      const priceDivs = Array.from(card.querySelectorAll('div.tw-text-200.tw-font-semibold'));
      for (let div of priceDivs) {
        const text = div.innerText.trim();
        if (text.startsWith("₹")) {
          price = text;
          break;
        }
      }
      return {
        name: nameElem ? nameElem.innerText.trim() : "No name",
        weight: weightElem ? weightElem.innerText.trim() : "No weight",
        price,
        image: imageElem ? imageElem.src : ""
      };
    });
  });

  await browser.close();
  return blinkitProducts;
}

// ----------------------
// Merged endpoint: /search-all
app.post("/search-all", async (req, res) => {
  let { location, product } = req.body;
  if (!product) {
    return res.status(400).json({ error: "Product is required" });
  }
  try {
    const [zeptoResults, blinkitResults] = await Promise.all([
      scrapeZepto(product),
      scrapeBlinkit(location, product)
    ]);
    res.json({ zepto: zeptoResults, blinkit: blinkitResults });
  } catch (error) {
    console.error("Error in merged scraping:", error);
    res.status(500).json({ error: "Failed to scrape data", details: error.toString() });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
