// worker.js

// Import the library into the worker scope
// Note: Path is relative to the worker file location
importScripts('lib/highlight.min.js');

self.onmessage = (event) => {
    const { id, code, language } = event.data;

    try {
        let result;

        // If we have a language hint, try to use it, otherwise auto-detect
        if (language && hljs.getLanguage(language)) {
            result = hljs.highlight(code, { language: language });
        } else {
            result = hljs.highlightAuto(code);
        }

        // Send the generated HTML back to the main thread
        self.postMessage({
            id: id,
            success: true,
            html: result.value,
            detectedLanguage: result.language
        });

    } catch (error) {
        // Fallback in case of parsing errors
        self.postMessage({
            id: id,
            success: false,
            error: error.message
        });
    }
};
