const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;

export const fetchUnsplashImage = async (searchTerm, index = 0) => {
    try {
        if (!UNSPLASH_ACCESS_KEY) return null;
        
        const res = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchTerm)}&per_page=5&orientation=squarish`,
            { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
        );
        const data = await res.json();
        
        if (data.results && data.results.length > 0) {
            const photo = data.results[index % data.results.length];
            return {
                url: photo.urls.small,
                filename: `${searchTerm.replace(/\s+/g, '-').toLowerCase()}.jpg`
            };
        }
        return null;
    } catch (error) {
        console.warn(`Unsplash fetch failed for: ${searchTerm}`);
        return null;
    }
};

export const fetchImageAsBlob = async (url) => {
    try {
        const res = await fetch(url);
        return await res.blob();
    } catch {
        return null;
    }
};

export const fetchCategoryImages = async (categories, onProgress) => {
    const imageMap = new Map();
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        if (onProgress) onProgress(i + 1, categories.length, category.name);

        const searchTerm = category.searchTerms[0];
        const imageData = await fetchUnsplashImage(searchTerm, i);

        if (imageData) {
            const blob = await fetchImageAsBlob(imageData.url);
            if (blob) {
                imageMap.set(category.name, {
                    url: imageData.url,
                    filename: imageData.filename,
                    blob
                });
            }
        }
        // Rate limit protection
        if (i < categories.length - 1) await delay(250);
    }

    return imageMap;
};