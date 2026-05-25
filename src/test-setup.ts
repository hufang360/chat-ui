import '@testing-library/jest-dom'

// jsdom 不支持 scrollIntoView，mock 它
window.HTMLElement.prototype.scrollIntoView = () => {}
