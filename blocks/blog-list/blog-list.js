export default async function decorate(block) {
  // 1. Fetch the JSON from your custom target index
  const response = await fetch('/blog-index.json');
  const json = await response.json();

  // 2. Filter out category root pages to only show actual articles
  const articles = json.data.filter((item) => item.description && item.description.trim() !== '');

  // 3. Extract all unique tags and folder categories dynamically
  const allTags = new Set();
  const allCategories = new Set();

  articles.forEach((article) => {
    // Extract Tags
    if (article.tags) {
      article.tags.split(',').forEach((tag) => allTags.add(tag.trim()));
    }
    // Extract Category from folder path (e.g., "/blogs/backend/article-1" -> "backend")
    const pathSegments = article.path.split('/');
    if (pathSegments.length > 3) {
      allCategories.add(pathSegments[2]);
    }
  });

  // 4. Read current URL parameters to preserve active filters on direct links
  const urlParams = new URLSearchParams(window.location.search);
  const currentTag = urlParams.get('tag') || 'all';
  const currentCategory = urlParams.get('category') || 'all';
  const currentSort = urlParams.get('sort') || 'newest';

  // 5. Clear default block content and build the UI controls
  block.textContent = '';
  const controls = document.createElement('div');
  controls.className = 'blog-controls';

  // Build Category Dropdown
  const categorySelect = document.createElement('select');
  const defaultCatOpt = document.createElement('option');
  defaultCatOpt.value = 'all';
  defaultCatOpt.textContent = 'All Categories';
  categorySelect.append(defaultCatOpt);

  allCategories.forEach((cat) => {
    const catLabel = cat.charAt(0).toUpperCase() + cat.slice(1);
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = catLabel;
    categorySelect.append(opt);
  });
  categorySelect.value = allCategories.has(currentCategory) ? currentCategory : 'all';

  // Build Tag Dropdown
  const tagSelect = document.createElement('select');
  const defaultTagOpt = document.createElement('option');
  defaultTagOpt.value = 'all';
  defaultTagOpt.textContent = 'All Tags';
  tagSelect.append(defaultTagOpt);

  allTags.forEach((tag) => {
    if (tag) {
      const opt = document.createElement('option');
      opt.value = tag;
      opt.textContent = tag;
      tagSelect.append(opt);
    }
  });
  tagSelect.value = allTags.has(currentTag) ? currentTag : 'all';

  // Build Sort Dropdown
  const sortSelect = document.createElement('select');
  const newestOpt = document.createElement('option');
  newestOpt.value = 'newest';
  newestOpt.textContent = 'Newest First';
  const oldestOpt = document.createElement('option');
  oldestOpt.value = 'oldest';
  oldestOpt.textContent = 'Oldest First';
  sortSelect.append(newestOpt, oldestOpt);
  sortSelect.value = ['newest', 'oldest'].includes(currentSort) ? currentSort : 'newest';

  // Create Grid Container
  const grid = document.createElement('div');
  grid.className = 'blog-grid';

  controls.append(categorySelect, tagSelect, sortSelect);
  block.append(controls, grid);

  // 6. Core render function handling filtering, sorting, and URL updating
  const renderArticles = () => {
    grid.textContent = '';
    let filteredData = [...articles];

    const selectedCategory = categorySelect.value;
    const selectedTag = tagSelect.value;
    const sortOrder = sortSelect.value;

    // Update the browser URL without reloading the page
    const newUrl = new URL(window.location);
    if (selectedCategory === 'all') {
      newUrl.searchParams.delete('category');
    } else {
      newUrl.searchParams.set('category', selectedCategory);
    }
    if (selectedTag === 'all') {
      newUrl.searchParams.delete('tag');
    } else {
      newUrl.searchParams.set('tag', selectedTag);
    }
    if (sortOrder === 'newest') {
      newUrl.searchParams.delete('sort');
    } else {
      newUrl.searchParams.set('sort', sortOrder);
    }
    window.history.replaceState({}, '', newUrl);

    // Apply the active Category filter (matching the folder path)
    if (selectedCategory !== 'all') {
      filteredData = filteredData.filter((article) => article.path.startsWith(`/blogs/${selectedCategory}/`));
    }

    // Apply the active Tag filter
    if (selectedTag !== 'all') {
      filteredData = filteredData.filter(
        (article) => article.tags && article.tags.includes(selectedTag),
      );
    }

    // Apply the active Date sort
    filteredData.sort((a, b) => (sortOrder === 'newest'
      ? b.lastModified - a.lastModified
      : a.lastModified - b.lastModified));

    // Check for empty results if a combination has no articles
    if (filteredData.length === 0) {
      const noResults = document.createElement('p');
      noResults.className = 'no-results';
      noResults.textContent = 'No articles found matching these filters.';
      grid.append(noResults);
      return;
    }

    // Generate and append the HTML for each filtered card safely
    filteredData.forEach((article) => {
      const card = document.createElement('div');
      card.className = 'blog-card';

      const img = document.createElement('img');
      img.src = article.image;
      img.alt = article.title;

      const contentDiv = document.createElement('div');
      contentDiv.className = 'card-content';

      const dateSpan = document.createElement('span');
      dateSpan.textContent = new Date(article.lastModified * 1000).toLocaleDateString();

      const titleH3 = document.createElement('h3');
      const titleA = document.createElement('a');
      titleA.href = article.path;
      titleA.textContent = article.title;
      titleH3.append(titleA);

      const descP = document.createElement('p');
      descP.textContent = article.description;

      contentDiv.append(dateSpan, titleH3, descP);
      card.append(img, contentDiv);
      grid.append(card);
    });
  };

  // 7. Attach event listeners
  categorySelect.addEventListener('change', renderArticles);
  tagSelect.addEventListener('change', renderArticles);
  sortSelect.addEventListener('change', renderArticles);

  // 8. Run initial render
  renderArticles();
}
