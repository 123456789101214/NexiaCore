export const BUSINESS_TEMPLATES = {
    supermarket: {
        label: '🛒 Supermarket / Grocery',
        description: 'Rice, vegetables, dairy, beverages, household items',
        categories: [
            {
                name: 'Rice & Grains',
                searchTerms: ['rice bag', 'samba rice', 'basmati rice'],
                products: [
                    { name: 'Samba Rice 5kg', buyingPrice: 650, price: 750, unit: 'pcs', minStock: 20 },
                    { name: 'Nadu Rice 5kg', buyingPrice: 580, price: 680, unit: 'pcs', minStock: 20 },
                    { name: 'Basmati Rice 1kg', buyingPrice: 380, price: 450, unit: 'pcs', minStock: 15 },
                    { name: 'Red Raw Rice 5kg', buyingPrice: 700, price: 820, unit: 'pcs', minStock: 10 },
                    { name: 'White Raw Rice 5kg', buyingPrice: 680, price: 790, unit: 'pcs', minStock: 10 },
                ]
            },
            {
                name: 'Dairy & Eggs',
                searchTerms: ['milk carton', 'dairy products', 'eggs'],
                products: [
                    { name: 'Anchor Full Cream Milk 400g', buyingPrice: 520, price: 610, unit: 'pcs', minStock: 30 },
                    { name: 'Kotmale Milk Powder 400g', buyingPrice: 480, price: 560, unit: 'pcs', minStock: 25 },
                    { name: 'Anchor Butter 200g', buyingPrice: 380, price: 450, unit: 'pcs', minStock: 20 },
                    { name: 'Farm Fresh Eggs (10 pack)', buyingPrice: 280, price: 340, unit: 'pcs', minStock: 30 },
                    { name: 'Curd Cup 150ml', buyingPrice: 95, price: 120, unit: 'pcs', minStock: 40 },
                ]
            },
            {
                name: 'Beverages',
                searchTerms: ['soft drink can', 'juice bottle', 'water bottle'],
                products: [
                    { name: 'Coca-Cola 330ml', buyingPrice: 110, price: 140, unit: 'pcs', minStock: 50 },
                    { name: 'Sprite 330ml', buyingPrice: 110, price: 140, unit: 'pcs', minStock: 40 },
                    { name: 'Elephant House Ginger Beer', buyingPrice: 95, price: 125, unit: 'pcs', minStock: 30 },
                    { name: 'Nestomalt 400g', buyingPrice: 490, price: 580, unit: 'pcs', minStock: 20 },
                    { name: 'Milo 400g', buyingPrice: 780, price: 920, unit: 'pcs', minStock: 20 },
                ]
            },
            {
                name: 'Instant Food',
                searchTerms: ['instant noodles', 'canned food', 'snacks'],
                products: [
                    { name: 'Prima Kottu Noodles Chicken', buyingPrice: 75, price: 95, unit: 'pcs', minStock: 60 },
                    { name: 'Maggi Noodles Chicken', buyingPrice: 80, price: 100, unit: 'pcs', minStock: 50 },
                    { name: 'MD Coconut Milk 400ml', buyingPrice: 195, price: 240, unit: 'pcs', minStock: 30 },
                    { name: 'Keells Corned Beef 340g', buyingPrice: 650, price: 780, unit: 'pcs', minStock: 15 },
                    { name: 'Britannia Crackers', buyingPrice: 120, price: 150, unit: 'pcs', minStock: 40 },
                ]
            },
            {
                name: 'Household',
                searchTerms: ['cleaning products', 'detergent', 'soap'],
                products: [
                    { name: 'Surf Excel 1kg', buyingPrice: 420, price: 510, unit: 'pcs', minStock: 20 },
                    { name: 'Vim Dishwash Bar', buyingPrice: 85, price: 110, unit: 'pcs', minStock: 30 },
                    { name: 'Domestos Toilet Cleaner', buyingPrice: 280, price: 350, unit: 'pcs', minStock: 15 },
                    { name: 'Dettol Soap 75g', buyingPrice: 145, price: 185, unit: 'pcs', minStock: 40 },
                    { name: 'Comfort Fabric Softener 800ml', buyingPrice: 380, price: 460, unit: 'pcs', minStock: 15 },
                ]
            },
            {
                name: 'Condiments & Spices',
                searchTerms: ['spices jar', 'cooking oil', 'condiments'],
                products: [
                    { name: 'MD Chilli Powder 100g', buyingPrice: 185, price: 230, unit: 'pcs', minStock: 20 },
                    { name: 'Turmeric Powder 100g', buyingPrice: 150, price: 190, unit: 'pcs', minStock: 20 },
                    { name: 'Coconut Oil 1L', buyingPrice: 680, price: 820, unit: 'pcs', minStock: 15 },
                    { name: 'Sunflower Oil 1L', buyingPrice: 520, price: 640, unit: 'pcs', minStock: 15 },
                    { name: 'MD Tomato Sauce 400g', buyingPrice: 180, price: 225, unit: 'pcs', minStock: 25 },
                ]
            },
        ]
    },

    pharmacy: {
        label: '💊 Pharmacy / Medical Store',
        description: 'OTC medicines, vitamins, personal care, baby products',
        categories: [
            {
                name: 'Pain Relief',
                searchTerms: ['medicine tablets', 'pharmacy products', 'pills'],
                products: [
                    { name: 'Panadol Tabs 10s', buyingPrice: 45, price: 65, unit: 'pcs', minStock: 50 },
                    { name: 'Brufen 400mg 10s', buyingPrice: 55, price: 80, unit: 'pcs', minStock: 40 },
                    { name: 'Disprin 10s', buyingPrice: 40, price: 58, unit: 'pcs', minStock: 40 },
                    { name: 'Solufen Syrup 100ml', buyingPrice: 180, price: 240, unit: 'pcs', minStock: 20 },
                    { name: 'Voltaren Gel 50g', buyingPrice: 320, price: 420, unit: 'pcs', minStock: 15 },
                ]
            },
            {
                name: 'Vitamins & Supplements',
                searchTerms: ['vitamin supplements', 'health capsules', 'multivitamin'],
                products: [
                    { name: 'Vitamin C 500mg 30s', buyingPrice: 280, price: 380, unit: 'pcs', minStock: 25 },
                    { name: 'Vitamin D3 30s', buyingPrice: 350, price: 480, unit: 'pcs', minStock: 20 },
                    { name: 'Calcium 500mg 30s', buyingPrice: 290, price: 390, unit: 'pcs', minStock: 20 },
                    { name: 'Zinc 50mg 30s', buyingPrice: 260, price: 360, unit: 'pcs', minStock: 15 },
                    { name: 'Omega 3 Fish Oil 30s', buyingPrice: 480, price: 650, unit: 'pcs', minStock: 15 },
                ]
            },
            {
                name: 'Personal Care',
                searchTerms: ['personal care products', 'skincare', 'hygiene'],
                products: [
                    { name: 'Colgate Toothpaste 175g', buyingPrice: 195, price: 250, unit: 'pcs', minStock: 30 },
                    { name: 'Listerine Mouthwash 250ml', buyingPrice: 380, price: 490, unit: 'pcs', minStock: 15 },
                    { name: 'Sensodyne Toothpaste 100g', buyingPrice: 380, price: 490, unit: 'pcs', minStock: 20 },
                    { name: 'Savlon Antiseptic 100ml', buyingPrice: 220, price: 290, unit: 'pcs', minStock: 20 },
                    { name: 'Band Aid 10s', buyingPrice: 95, price: 140, unit: 'pcs', minStock: 30 },
                ]
            },
            {
                name: 'Baby Care',
                searchTerms: ['baby products', 'baby powder', 'diapers'],
                products: [
                    { name: 'Huggies Diapers M (10s)', buyingPrice: 580, price: 720, unit: 'pcs', minStock: 20 },
                    { name: 'Johnson Baby Powder 100g', buyingPrice: 250, price: 330, unit: 'pcs', minStock: 15 },
                    { name: 'Johnson Baby Shampoo 200ml', buyingPrice: 290, price: 380, unit: 'pcs', minStock: 15 },
                    { name: 'Cerelac Rice 300g', buyingPrice: 580, price: 720, unit: 'pcs', minStock: 12 },
                    { name: 'Farex Baby Food 300g', buyingPrice: 420, price: 540, unit: 'pcs', minStock: 12 },
                ]
            },
        ]
    },

    fashion: {
        label: '👗 Fashion / Clothing Store',
        description: 'Men, women, children clothing and accessories',
        categories: [
            {
                name: "Men's Wear",
                searchTerms: ['men shirt', 'mens clothing', 'polo shirt'],
                products: [
                    { name: "Men's Polo Shirt (S)", buyingPrice: 650, price: 1200, unit: 'pcs', minStock: 10 },
                    { name: "Men's Polo Shirt (M)", buyingPrice: 650, price: 1200, unit: 'pcs', minStock: 15 },
                    { name: "Men's Polo Shirt (L)", buyingPrice: 650, price: 1200, unit: 'pcs', minStock: 15 },
                    { name: "Men's Polo Shirt (XL)", buyingPrice: 680, price: 1250, unit: 'pcs', minStock: 10 },
                    { name: "Men's Formal Shirt (M)", buyingPrice: 850, price: 1800, unit: 'pcs', minStock: 8 },
                ]
            },
            {
                name: "Women's Wear",
                searchTerms: ['women dress', 'ladies clothing', 'women fashion'],
                products: [
                    { name: "Ladies Blouse (S)", buyingPrice: 480, price: 990, unit: 'pcs', minStock: 10 },
                    { name: "Ladies Blouse (M)", buyingPrice: 480, price: 990, unit: 'pcs', minStock: 12 },
                    { name: "Ladies Blouse (L)", buyingPrice: 500, price: 1050, unit: 'pcs', minStock: 10 },
                    { name: "Women's Midi Dress", buyingPrice: 950, price: 2200, unit: 'pcs', minStock: 8 },
                    { name: "Women's Leggings", buyingPrice: 380, price: 850, unit: 'pcs', minStock: 15 },
                ]
            },
            {
                name: 'Accessories',
                searchTerms: ['fashion accessories', 'handbag', 'belt'],
                products: [
                    { name: 'Ladies Handbag (Black)', buyingPrice: 1200, price: 2800, unit: 'pcs', minStock: 5 },
                    { name: 'Men\'s Leather Belt', buyingPrice: 450, price: 1100, unit: 'pcs', minStock: 8 },
                    { name: 'Fashion Scarf', buyingPrice: 280, price: 650, unit: 'pcs', minStock: 10 },
                    { name: 'Sunglasses (UV400)', buyingPrice: 380, price: 900, unit: 'pcs', minStock: 8 },
                    { name: 'Canvas Tote Bag', buyingPrice: 320, price: 750, unit: 'pcs', minStock: 10 },
                ]
            },
        ]
    },

    electronics: {
        label: '📱 Electronics / Tech Store',
        description: 'Mobile accessories, cables, gadgets',
        categories: [
            {
                name: 'Mobile Accessories',
                searchTerms: ['phone charger', 'mobile accessories', 'earphones'],
                products: [
                    { name: 'USB-C Charger Cable 1m', buyingPrice: 180, price: 450, unit: 'pcs', minStock: 20 },
                    { name: 'Lightning Cable 1m', buyingPrice: 190, price: 480, unit: 'pcs', minStock: 15 },
                    { name: 'Wireless Earbuds', buyingPrice: 1200, price: 2800, unit: 'pcs', minStock: 10 },
                    { name: 'Phone Case Universal', buyingPrice: 180, price: 490, unit: 'pcs', minStock: 25 },
                    { name: 'Screen Protector Tempered', buyingPrice: 120, price: 350, unit: 'pcs', minStock: 30 },
                ]
            },
            {
                name: 'Power & Charging',
                searchTerms: ['power bank', 'charger adapter', 'USB hub'],
                products: [
                    { name: 'Power Bank 10000mAh', buyingPrice: 1800, price: 3500, unit: 'pcs', minStock: 8 },
                    { name: 'Fast Charger 20W', buyingPrice: 850, price: 1800, unit: 'pcs', minStock: 10 },
                    { name: 'USB Hub 4-Port', buyingPrice: 680, price: 1400, unit: 'pcs', minStock: 8 },
                    { name: 'Travel Adapter Universal', buyingPrice: 450, price: 1100, unit: 'pcs', minStock: 10 },
                    { name: 'Wireless Charger Pad', buyingPrice: 980, price: 2200, unit: 'pcs', minStock: 8 },
                ]
            },
        ]
    },

    restaurant: {
        label: '🍽️ Restaurant / Cafe',
        description: 'Food ingredients, beverages, packaging',
        categories: [
            {
                name: 'Raw Ingredients',
                searchTerms: ['vegetables fresh', 'meat chicken', 'fresh fish'],
                products: [
                    { name: 'Chicken Breast 1kg', buyingPrice: 980, price: 1200, unit: 'kg', minStock: 5 },
                    { name: 'Beef 1kg', buyingPrice: 1400, price: 1800, unit: 'kg', minStock: 3 },
                    { name: 'Fresh Fish 1kg', buyingPrice: 800, price: 1100, unit: 'kg', minStock: 3 },
                    { name: 'Tomatoes 1kg', buyingPrice: 150, price: 220, unit: 'kg', minStock: 5 },
                    { name: 'Onions 1kg', buyingPrice: 120, price: 180, unit: 'kg', minStock: 5 },
                ]
            },
            {
                name: 'Beverages',
                searchTerms: ['coffee beans', 'tea leaves', 'juice'],
                products: [
                    { name: 'Coffee Beans 500g', buyingPrice: 980, price: 1400, unit: 'pcs', minStock: 5 },
                    { name: 'Ceylon Tea 200g', buyingPrice: 380, price: 520, unit: 'pcs', minStock: 8 },
                    { name: 'Mineral Water 500ml (24 pack)', buyingPrice: 480, price: 720, unit: 'pcs', minStock: 10 },
                    { name: 'Orange Juice 1L', buyingPrice: 320, price: 480, unit: 'pcs', minStock: 10 },
                    { name: 'Milk Full Cream 1L', buyingPrice: 280, price: 380, unit: 'pcs', minStock: 8 },
                ]
            },
        ]
    }
};

export const UNITS = ['pcs', 'kg', 'g', 'ltr', 'ml', 'packet', 'bottle', 'bundle'];