const fetchButton = document.getElementById('fetchButton');
const shopList = document.getElementById('shopList');
const generateRouteButton = document.getElementById('generateRouteButton');
const shopCodesInput = document.getElementById('shopCodes');

let db;

// Initialize IndexedDB
const request = indexedDB.open("ShopDatabase", 1);

request.onupgradeneeded = function(event) {
    db = event.target.result;
    db.createObjectStore("shops", { keyPath: "code" });
};

request.onsuccess = function(event) {
    db = event.target.result;
};

// Fetch shop data from Telegram and store it locally
fetchButton.addEventListener('click', async () => {
    const shops = await fetchShopsFromTelegram();
    if (shops.length > 0) {
        saveShopsToLocal(shops);
        displayShops();
    } else {
        alert("No shop data found or unable to fetch details.");
    }
});

// Fetch shops from Telegram
async function fetchShopsFromTelegram() {
    const token = '6251472196:AAG3YQQy4jjBHHyk234EkLm894f81U1AEio'; // Your provided bot token
    const url = `https://api.telegram.org/bot${token}/getUpdates`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.ok) {
            console.error("Failed to fetch updates:", data);
            return [];
        }

        // Filter and parse messages from the correct chat (channel username)
        const shops = data.result
            .filter(message => message.message.chat.username === "kudukkadairy")
            .map(message => {
                const details = message.message.text.split(','); // Adjust this based on the message format
                return { code: details[0], name: details[1], address: details[2] };
            });

        return shops;

    } catch (error) {
        console.error("Error fetching Telegram updates:", error);
        return [];
    }
}

// Save shops to IndexedDB
function saveShopsToLocal(shops) {
    const transaction = db.transaction(["shops"], "readwrite");
    const objectStore = transaction.objectStore("shops");

    shops.forEach(shop => {
        objectStore.put(shop);
    });
}

// Display shops in the UI
function displayShops() {
    shopList.innerHTML = ''; // Clear previous list

    const transaction = db.transaction(["shops"], "readonly");
    const objectStore = transaction.objectStore("shops");

    objectStore.getAll().onsuccess = function(event) {
        const shops = event.target.result;
        shops.forEach(shop => {
            const listItem = document.createElement('li');
            listItem.textContent = `${shop.code}: ${shop.name}, ${shop.address}`;
            shopList.appendChild(listItem);
        });
    };
}

// Generate route based on selected shop codes
generateRouteButton.addEventListener('click', () => {
    const shopCodes = shopCodesInput.value.split(',');
    generateRoute(shopCodes);
});

// Generate Google Maps route
function generateRoute(selectedShopCodes) {
    const transaction = db.transaction(["shops"], "readonly");
    const objectStore = transaction.objectStore("shops");

    let selectedShops = [];
    let counter = 0;

    selectedShopCodes.forEach(code => {
        const request = objectStore.get(code.trim());
        request.onsuccess = function(event) {
            selectedShops.push(event.target.result);
            counter++;
            if (counter === selectedShopCodes.length) {
                openGoogleMapsRoute(selectedShops);
            }
        };
    });
}

// Open the route in Google Maps
function openGoogleMapsRoute(shops) {
    const addresses = shops.map(shop => encodeURIComponent(shop.address)).join('/');
    const mapUrl = `https://www.google.com/maps/dir/${addresses}`;
    window.open(mapUrl, '_blank');
}
