# Zepto & Blinkit Product Scraper

A Node.js web scraper using Puppeteer to fetch product details from Zepto and Blinkit. Enter a location and a product query to compare pricing and availability across both platforms.

## Features
- Scrapes product name, price, image, and weight from Zepto & Blinkit.
- Supports automatic and manual location entry.
- Runs in headless mode for efficiency.
- Uses concurrent requests to speed up scraping.

## Installation
```sh
# Clone the repository
git clone https://github.com/yourusername/zepto-blinkit-scraper.git
cd zepto-blinkit-scraper

# Install dependencies
npm install
```

## Usage
```sh
# Start the server
node server.js
```

### API Endpoint
#### `POST /search-all`
**Request Body:**
```json
{
  "location": "Your Location",
  "product": "Product Name"
}
```

**Response:**
```json
{
  "zepto": [
    { "name": "Product 1", "price": "₹100", "image": "URL", "weight": "1kg" },
    ...
  ],
  "blinkit": [
    { "name": "Product 1", "price": "₹95", "image": "URL", "weight": "1kg" },
    ...
  ]
}
```

## Deployment
To deploy on a cloud server like Render:
- Ensure Puppeteer dependencies are installed.
- Use `--no-sandbox` mode for Puppeteer.
- Keep `headless: true` for best performance.

## License
This project is open-source under the MIT License.

