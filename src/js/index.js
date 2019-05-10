import Search from './models/Search';
import * as searchView from './views/searchView';
import * as recipeView from './views/recipeView';
import Recipe from './models/Recipe';
import List from './models/list';
import * as listView from './views/listView';
import { elements, renderLoader, clearLoader } from './views/base';
import Likes from './models/Likes';
import * as likesView from './views/likesView';

/** Global state
 *  - search object
 *  - current recipe
 *  - shopping list object
 *  - liked recipes
 */
const state = {};

// Search Controller
const controlSearch = async () => {
  // 1) get query from view
  const query = searchView.getInput();

  if (query) {
    // 2) New search object and add to state
    state.search = new Search(query)

    try {
      // 3) prepare ui for results
      searchView.clearInput();
      searchView.clearSearch();
      renderLoader(elements.searchRes);

      // 4) search the recipes
      await state.search.getResult();

      // 5) render results on the ui
      clearLoader();
      searchView.renderResults(state.search.result);
    } catch (error) {
      console.log(error);
      clearLoader();
    }
  }
};

elements.searchForm.addEventListener('submit', e => {
  e.preventDefault();
  controlSearch();
});

elements.searchResPages.addEventListener('click', e => {
  const btn = e.target.closest('.btn-inline');
  if (btn) {
    const goToPage = parseInt(btn.dataset.goto, 10);
    searchView.clearSearch();
    searchView.renderResults(state.search.result, goToPage);
  }
});

//Recipe Controller

const controlRecipe = async () => {
  const id = window.location.hash.substring(1);

  if (id) {
    //Prepare UI for changes
    recipeView.clearRecipe();
    //render loader
    renderLoader(elements.recipe);

    //Highlight selected search item
    if (state.search) {
      searchView.highlightSelected(id);
    }

    //Create new recipe object
    state.recipe = new Recipe(id);

    try {
      //Get recipe data
      await state.recipe.getRecipe();
      state.recipe.parseIngredients();

      //calculate servings and data
      state.recipe.calcTime();
      state.recipe.calcServings();

      //Render recipe
      clearLoader();
      recipeView.renderRecipe(state.recipe, state.likes.isLiked(id));
    } catch (error) {
      console.log(error);
    }
  }
};
window.addEventListener('hashchange', controlRecipe);
//window.addEventListener('load', controlRecipe);


// List Controller
const controlList = () => {
  //Create a new list if there is none
  if (!state.list) {
    state.list = new List();
  }

  //Add each ingredient to the list and UI
  state.recipe.ingredients.forEach(el => {
    const item = state.list.addItem(el.count, el.unit, el.ingredient);
    listView.renderItem(item);
  });
};

// Handle delete and update list item events
elements.shoppingList.addEventListener('click', e => {
  const id = e.target.closest('.shopping__item').dataset.itemid;

  // Handle the delete
  if (e.target.matches('.shopping__delete, .shopping__delete *')) {
    // Delete from state
    state.list.deleteItem(id);

    // Delete from the UI
    listView.deleteItem(id);
  } else if (e.target.matches('.shopping__count-value')) {
    const val = parseFloat(e.target.value, 10);
    state.list.updateCount(id, val);
  }

});

// Like Controller
const controlLike = () => {
  if (!state.likes) {
    state.likes = new Likes();
  }
  const currentID = state.recipe.id;

  // User has not yet liked current recipe
  if (!state.likes.isLiked(currentID)) {
    // Add like to the state
    const newLike = state.likes.addLike(
      currentID,
      state.recipe.title,
      state.recipe.author,
      state.recipe.img
    )
    // Toggle the like button
    likesView.toggleLikeBtn(true);

    // Add like to the UI list
    likesView.renderLike(newLike)
    //  User has liked current recipe
  } else {
    // remove like to the state
    state.likes.deleteLike(currentID);
    // Toggle the like button
    likesView.toggleLikeBtn(false);

    // remove like to the UI list
    likesView.deleteLike(currentID);
  }
  likesView.toggleLikeMenu(state.likes.getNumLikes());
};

// Restore liked recipes on page load
window.addEventListener('load', () => {
  state.likes = new Likes();
  // restore likes
  state.likes.readStorage();

  //toggle like menu button
  likesView.toggleLikeMenu(state.likes.getNumLikes());

  // render existing likes
  state.likes.likes.forEach(like => likesView.renderLike(like));
});

// handling recipe button clicks
elements.recipe.addEventListener('click', e => {
  if (e.target.matches('.btn-decrease, .btn-decrease *')) {
    // Decrease button is clicked
    if (state.recipe.servings > 1) {
      state.recipe.updateServings('dec');
      recipeView.updateServingsIngredients(state.recipe);
    }
  } else if (e.target.matches('.btn-increase, .btn-increase *')) {
    // Increase button is clicked
    state.recipe.updateServings('inc');
    recipeView.updateServingsIngredients(state.recipe);
  } else if (e.target.matches('.recipe__btn--add, .recipe__btn--add *')) {
    controlList();
  } else if (e.target.matches('.recipe__love, .recipe__love *')) {
    // like controller
    controlLike();

  }
});