function highlightCodeBlocks() {
    const codeBlocks = document.querySelectorAll('pre');

    codeBlocks.forEach((block) => {
        if (block.dataset.highlighted === "yes") return;

        const codeElement = block.querySelector('code');

        if (codeElement) {
            hljs.highlightElement(codeElement);

            block.dataset.highlighted = "yes";

            block.style.fontFamily = "'Fira Code', 'Consolas', monospace";
        }
    });
}

highlightCodeBlocks();

const observer = new MutationObserver((mutations) => {
    highlightCodeBlocks();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

console.log("Gemini Highlighter ist aktiv!");
