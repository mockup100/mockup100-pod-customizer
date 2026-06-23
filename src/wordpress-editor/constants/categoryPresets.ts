export type PresetCategoryNode = {
  name: string
  slug: string
  children?: PresetCategoryNode[]
}

export const officialCategoryRootNames = [
  "Apparel & Underwear",
  "Footwear",
  "Bags & Luggage",
  "Accessories",
  "Home & Living",
  "Drinkware",
  "Stationery & Tech Accessories",
  "Packaging & Print",
]

export const categoryPresets: PresetCategoryNode[] = [
  {
    name: "Apparel & Underwear",
    slug: "apparel-underwear",
    children: [
      {
        name: "T-Shirts",
        slug: "t-shirts",
        children: [
          { name: "Crew Neck T-Shirts", slug: "crew-neck-t-shirts" },
          { name: "Polo Shirts", slug: "polo-shirts" },
          { name: "Long Sleeve T-Shirts", slug: "long-sleeve-t-shirts" },
        ],
      },
      {
        name: "Outerwear",
        slug: "outerwear",
        children: [
          { name: "Hoodies", slug: "hoodies" },
          { name: "Sweatshirts", slug: "sweatshirts" },
          { name: "Jackets", slug: "jackets" },
        ],
      },
      {
        name: "Intimates & Loungewear",
        slug: "intimates-loungewear",
        children: [
          { name: "Pajamas", slug: "pajamas" },
          { name: "Bathrobes", slug: "bathrobes" },
          { name: "Socks", slug: "socks" },
        ],
      },
    ],
  },
  {
    name: "Footwear",
    slug: "footwear",
    children: [
      {
        name: "Sneakers",
        slug: "sneakers",
        children: [
          { name: "Low Top Sneakers", slug: "low-top-sneakers" },
          { name: "High Top Sneakers", slug: "high-top-sneakers" },
          { name: "Slip-On Sneakers", slug: "slip-on-sneakers" },
        ],
      },
      {
        name: "Boots",
        slug: "boots",
        children: [
          { name: "Casual Boots", slug: "casual-boots" },
          { name: "Chelsea Boots", slug: "chelsea-boots" },
          { name: "Rain Boots", slug: "rain-boots" },
        ],
      },
      {
        name: "Sandals & Slides",
        slug: "sandals-slides",
        children: [
          { name: "Slides", slug: "slides" },
          { name: "Flat Sandals", slug: "flat-sandals" },
          { name: "Sport Sandals", slug: "sport-sandals" },
        ],
      },
    ],
  },
  {
    name: "Bags & Luggage",
    slug: "bags-luggage",
    children: [
      {
        name: "Everyday Bags",
        slug: "everyday-bags",
        children: [
          { name: "Tote Bags", slug: "tote-bags" },
          { name: "Backpacks", slug: "backpacks" },
          { name: "Crossbody Bags", slug: "crossbody-bags" },
        ],
      },
      {
        name: "Travel Bags",
        slug: "travel-bags",
        children: [
          { name: "Duffel Bags", slug: "duffel-bags" },
          { name: "Suitcases", slug: "suitcases" },
          { name: "Garment Bags", slug: "garment-bags" },
        ],
      },
      {
        name: "Small Leather Goods",
        slug: "small-leather-goods",
        children: [
          { name: "Wallets", slug: "wallets" },
          { name: "Card Holders", slug: "card-holders" },
          { name: "Pouches", slug: "pouches" },
        ],
      },
    ],
  },
  {
    name: "Accessories",
    slug: "accessories",
    children: [
      {
        name: "Headwear",
        slug: "headwear",
        children: [
          { name: "Baseball Caps", slug: "baseball-caps" },
          { name: "Beanies", slug: "beanies" },
          { name: "Bucket Hats", slug: "bucket-hats" },
        ],
      },
      {
        name: "Eyewear",
        slug: "eyewear",
        children: [
          { name: "Sunglasses", slug: "sunglasses" },
          { name: "Optical Frames", slug: "optical-frames" },
          { name: "Eyewear Cases", slug: "eyewear-cases" },
        ],
      },
      {
        name: "Jewelry & Watches",
        slug: "jewelry-watches",
        children: [
          { name: "Necklaces", slug: "necklaces" },
          { name: "Bracelets", slug: "bracelets" },
          { name: "Watches", slug: "watches" },
        ],
      },
    ],
  },
  {
    name: "Home & Living",
    slug: "home-living",
    children: [
      {
        name: "Textile Decor",
        slug: "textile-decor",
        children: [
          { name: "Pillows", slug: "pillows" },
          { name: "Blankets", slug: "blankets" },
          { name: "Curtains", slug: "curtains" },
        ],
      },
      {
        name: "Bath & Bedroom",
        slug: "bath-bedroom",
        children: [
          { name: "Towels", slug: "towels" },
          { name: "Bathrobes", slug: "home-bathrobes" },
          { name: "Bed Sheets", slug: "bed-sheets" },
        ],
      },
      {
        name: "Kitchen & Dining",
        slug: "kitchen-dining",
        children: [
          { name: "Aprons", slug: "aprons" },
          { name: "Oven Mitts", slug: "oven-mitts" },
          { name: "Table Runners", slug: "table-runners" },
        ],
      },
    ],
  },
  {
    name: "Drinkware",
    slug: "drinkware",
    children: [
      {
        name: "Cups & Mugs",
        slug: "cups-mugs",
        children: [
          { name: "Ceramic Mugs", slug: "ceramic-mugs" },
          { name: "Travel Mugs", slug: "travel-mugs" },
          { name: "Tumblers", slug: "tumblers" },
        ],
      },
      {
        name: "Bottles",
        slug: "bottles",
        children: [
          { name: "Water Bottles", slug: "water-bottles" },
          { name: "Sports Bottles", slug: "sports-bottles" },
          { name: "Thermos Bottles", slug: "thermos-bottles" },
        ],
      },
      {
        name: "Barware",
        slug: "barware",
        children: [
          { name: "Wine Glasses", slug: "wine-glasses" },
          { name: "Beer Glasses", slug: "beer-glasses" },
          { name: "Coasters", slug: "coasters" },
        ],
      },
    ],
  },
  {
    name: "Stationery & Tech Accessories",
    slug: "stationery-tech-accessories",
    children: [
      {
        name: "Paper Goods",
        slug: "paper-goods",
        children: [
          { name: "Notebooks", slug: "notebooks" },
          { name: "Greeting Cards", slug: "greeting-cards" },
          { name: "Stickers", slug: "stickers" },
        ],
      },
      {
        name: "Device Accessories",
        slug: "device-accessories",
        children: [
          { name: "Phone Cases", slug: "phone-cases" },
          { name: "Laptop Sleeves", slug: "laptop-sleeves" },
          { name: "Mouse Pads", slug: "mouse-pads" },
        ],
      },
      {
        name: "Desk Accessories",
        slug: "desk-accessories",
        children: [
          { name: "Desk Mats", slug: "desk-mats" },
          { name: "Pen Holders", slug: "pen-holders" },
          { name: "Lanyards", slug: "lanyards" },
        ],
      },
    ],
  },
  {
    name: "Packaging & Print",
    slug: "packaging-print",
    children: [
      {
        name: "Retail Packaging",
        slug: "retail-packaging",
        children: [
          { name: "Shopping Bags", slug: "shopping-bags" },
          { name: "Gift Boxes", slug: "gift-boxes" },
          { name: "Mailer Boxes", slug: "mailer-boxes" },
        ],
      },
      {
        name: "Labels & Tags",
        slug: "labels-tags",
        children: [
          { name: "Hang Tags", slug: "hang-tags" },
          { name: "Product Labels", slug: "product-labels" },
          { name: "Sticker Seals", slug: "sticker-seals" },
        ],
      },
      {
        name: "Marketing Print",
        slug: "marketing-print",
        children: [
          { name: "Flyers", slug: "flyers" },
          { name: "Posters", slug: "posters" },
          { name: "Postcards", slug: "postcards" },
        ],
      },
    ],
  },
]
