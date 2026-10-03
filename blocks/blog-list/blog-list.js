export default async function decorate(block) {
  // 1. Fetch the JSON from your custom target index
  const response = await fetch('/blog-index.json');
  const json = await response.json();

  // 2. Filter out category root pages to only show actual articles
  const articles = json.data.filter((item) => item.description !== '');

  // 3. Extract all unique tags dynamically
  const allTags = new Set();
  articles.forEach((article) => {
    if (article.tags) {
      article.tags.split(',').forEach((tag) => allTags.add(tag.trim()));
    }
  });

  // 4. Read current URL parameters to preserve active filters on direct links
  const urlParams = new URLSearchParams(window.location.search);
  const currentTag = urlParams.get('tag') || 'all';
  const currentSort = urlParams.get('sort') || 'newest';

  // 5. Clear default block content and build the UI controls
  block.textContent = '';

  const controls = document.createElement('div');
  controls.className = 'blog-controls';

  const tagSelect = document.createElement('select');
  tagSelect.innerHTML = '<option value="all">All Tags</option>';
  allTags.forEach((tag) => {
    if (tag) tagSelect.innerHTML += `<option value="${tag}">${tag}</option>`;
  });
  tagSelect.value = allTags.has(currentTag) ? currentTag : 'all';

  const sortSelect = document.createElement('select');
  sortSelect.innerHTML = `
    <option value="newest">Newest First</option>
    <option value="oldest">Oldest First</option>
  `;
  sortSelect.value = ['newest', 'oldest'].includes(currentSort) ? currentSort : 'newest';

  const grid = document.createElement('div');
  grid.className = 'blog-grid';

  controls.append(tagSelect, sortSelect);
  block.append(controls, grid);

  // 6. Core render function handling filtering, sorting, and URL updating
  const renderArticles = () => {
    grid.innerHTML = '';
    let filteredData = [...articles];

    const selectedTag = tagSelect.value;
    const sortOrder = sortSelect.value;

    // Update the browser URL without reloading the page
    const newUrl = new URL(window.location);
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

    // Apply the active tag filter
    if (selectedTag !== 'all') {
      filteredData = filteredData.filter(
        (article) => article.tags && article.tags.includes(selectedTag),
      );
    }

    // Apply the active date sort
    filteredData.sort((a, b) => (sortOrder === 'newest'
      ? b.lastModified - a.lastModified
      : a.lastModified - b.lastModified));

    // Generate and append the HTML for each filtered card
    filteredData.forEach((article) => {
      const card = document.createElement('div');
      card.className = 'blog-card';
      const date = new Date(article.lastModified * 1000).toLocaleDateString();

      card.innerHTML = `
        <img src="${article.image}" alt="${article.title}">
        <div class="card-content">
          <span>${date}</span>
          <h3><a href="${article.path}">${article.title}</a></h3>
          <p>${article.description}</p>
        </div>
      `;
      grid.append(card);
    });
  };

  // 7. Attach event listeners
  tagSelect.addEventListener('change', renderArticles);
  sortSelect.addEventListener('change', renderArticles);

  // 8. Run initial render
  renderArticles();
}
