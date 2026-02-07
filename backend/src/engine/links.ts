export function generateSearchLink(productName: string, brand?: string): string {
  const query = brand ? `${brand} ${productName}` : productName;
  return `https://www.google.com/search?q=${encodeURIComponent(query + ' buy')}`;
}

export function ensureBuyLinks(
  buyLinks: Array<{ label: string; url: string }>,
  productName: string,
  brand: string
): Array<{ label: string; url: string }> {
  if (!buyLinks || buyLinks.length === 0) {
    return [{ label: 'Search', url: generateSearchLink(productName, brand) }];
  }
  // Ensure at least a search link exists
  const hasSearch = buyLinks.some((l) => l.label.toLowerCase() === 'search');
  if (!hasSearch) {
    return [...buyLinks, { label: 'Search', url: generateSearchLink(productName, brand) }];
  }
  return buyLinks;
}
