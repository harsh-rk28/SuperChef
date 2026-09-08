// ===== VARIABLES =====
let ingredients = []
let savedRecipes = JSON.parse(localStorage.getItem('savedRecipes')) || []
let activeMethod = 'stovetop'
let isListening = false
let chatHistory = []
let proteinSources = []

// ===== INGREDIENTS =====
const ingredientInput = document.getElementById('ingredient-input')
const addBtn = document.getElementById('add-btn')
const ingredientTags = document.getElementById('ingredient-tags')


function addIngredient() {
  const value = ingredientInput.value.trim()
  if (value === '') return
  if (ingredients.includes(value.toLowerCase())) return

  ingredients.push(value.toLowerCase())
  ingredientInput.value = ''
  
  renderTags()
}

function renderTags() {
  ingredientTags.innerHTML = ''
  
  ingredients.forEach(function(ingredient, index) {
    const tag = document.createElement('div')
    tag.className = 'tag'
    tag.innerHTML = `${ingredient} <span onclick="removeIngredient(${index})">✕</span>`
    ingredientTags.appendChild(tag)
  })
}

function removeIngredient(index) {
  ingredients.splice(index, 1)
  renderTags()
}

addBtn.addEventListener('click', addIngredient)
document.getElementById('search-btn').addEventListener('click', generateRecipes)


ingredientInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') addIngredient()
})

// ===== FILTERS =====
let activeFilter = null

const filterBtns = document.querySelectorAll('.filter-btn')

filterBtns.forEach(function(btn) {
  btn.addEventListener('click', function() {
    filterBtns.forEach(function(b) {
      b.classList.remove('active')
    })

    if (activeFilter === btn.dataset.filter) {
      activeFilter = null
    } else {
      btn.classList.add('active')
      activeFilter = btn.dataset.filter
    }
  })
})

// ===== COOKING METHODS =====
const methodBtns = document.querySelectorAll('.method-btn')

methodBtns.forEach(function(btn) {
  btn.addEventListener('click', function() {
    methodBtns.forEach(function(b) {
      b.classList.remove('active-method')
    })
    btn.classList.add('active-method')
    activeMethod = btn.dataset.method
  })
})

// ===== CHAT =====
const chatBox = document.getElementById('chat-box')
const chatInput = document.getElementById('chat-input')
const chatSendBtn = document.getElementById('chat-send-btn')

function addMessage(text, sender) {
  const msg = document.createElement('div')
  msg.className = sender === 'user' ? 'message user-message' : 'message ai-message'
  
  if(sender=== 'ai'){
    msg.innerHTML = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/###(.*?)\n/g, '<h3>$1</h3>')
    .replace(/##(.*?)\n/g, '<h3>$1</h3>')
    .replace(/\n/g, '<br>')

    const speakBtn = document.createElement('button')
    speakBtn.className = 'speak-btn'
    speakBtn.innerText = '🔊'
    speakBtn.onclick = function() {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel()
            speakBtn.innerText = '🔊'
        } else {
            const cleanText = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/###/g, '').replace(/##/g, '').replace(/#/g, '')
            const utterance = new SpeechSynthesisUtterance(cleanText)
            utterance.rate = 1.3
            utterance.pitch = 1.1
            window.speechSynthesis.speak(utterance)
            speakBtn.innerText = '⏹️'
            utterance.onend = function() {
            speakBtn.innerText = '🔊'
            }
        }
    }
    msg.appendChild(speakBtn)
  } 
  else {
    msg.innerText = text
  }

  chatBox.appendChild(msg)
  chatBox.scrollTop = chatBox.scrollHeight
}

// ===== VOICE OUTPUT =====
function speakMessage(text) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 1
    utterance.pitch = 1
    window.speechSynthesis.speak(utterance)
  }
}

async function sendMessage() {
  const text = chatInput.value.trim()
  if (text === '') return

  addMessage(text, 'user')
  chatInput.value = ''
  addMessage('Thinking...', 'ai')

  chatHistory.push({
    role: 'user',
    content: `You are FuelUp, a creative fitness recipe assistant for gym goers who are BORED of basic meals.
    The user has these ingredients: ${ingredients.join(', ')}.
    User message: ${text}

    IMPORTANT RULES:
    - If the user is asking for recipe IDEAS or suggestions — give 4-5 options with just the name, one line description and macros only. NO full recipe yet.
    - If the user picks a specific recipe or asks for details/steps — THEN give the full recipe with ingredients, measurements and steps.
    - NEVER suggest boring basic meals like "hash", "bowl", "salad", "rice and chicken" type stuff
    - Think like a creative street food chef — loaded nachos, taquitos, puff pastry stuffed with chicken and cheese, KFC style cornflake crusted chicken tenders, smash burgers, korean BBQ wraps, buffalo chicken loaded fries, dynamite sauce chicken, stuffed quesadillas, crispy wraps
    - You CAN suggest recipes even if user doesn't have all ingredients — just mention what extra they need to buy
    - Always include exact macros (calories, protein, carbs, fat) and measurements when giving full recipe
    - Be specific — if you say Korean, use gochujang, sesame oil. If you say Mexican, use proper Mexican flavours
    - Reply friendly and concise. No markdown symbols like ** or ###`
  })

  try {
    const response = await fetch(
      '/api/chat',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
                    // API CAREFUL // 
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: chatHistory,
          max_tokens: 1024,
        })
      }
    )

    const data = await response.json()
    const reply = data.choices[0].message.content

    chatBox.lastChild.remove()
    chatHistory.push({
      role: 'assistant',
      content: reply
    })
    addMessage(reply, 'ai') 

  } catch (error) {
    chatBox.lastChild.remove()
    addMessage('Something went wrong, try again!', 'ai')
  }
}

chatSendBtn.addEventListener('click', sendMessage)

chatInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') sendMessage()
})

// ===== RECIPE CARDS =====
async function generateRecipes() {
  if (ingredients.length === 0 && !activeFilter) return

  const recipeGrid = document.getElementById('recipe-grid')
  recipeGrid.innerHTML = '<p class="placeholder-text">Finding recipes for you... 🍳</p>'

  try {
    const response = await fetch(
      '/api/chat',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
                            // API CAREFUL // 
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'user',
              content: `You are a fitness recipe assistant. Generate 3 recipes based on:
              Ingredients the user has: ${ingredients.join(', ')}.
              Mood/filter: ${activeFilter}.
              
              ${activeFilter === 'quick' ? 
              'Recipes MUST be under 20 minutes. Simple, fast, minimal steps.' : 
              activeFilter === 'high-protein' ? 
              'Recipes MUST have 30g+ protein per serving. Focus on chicken, eggs, Greek yogurt, cottage cheese, tuna.' : 
              activeFilter === 'sweet' ? 
              'Sweet treats and desserts — think cheesecake, Greek yogurt pudding, overnight oats, protein pancakes, energy balls. Healthy but satisfying.' : 
              activeFilter === 'savoury' ? 
              'Rich, hearty savoury meals — think loaded dishes, cheesy, umami flavours, comfort food with good macros.' : 
              activeFilter === 'spicy' ? 
              'Genuinely spicy recipes — sriracha, chili, jalapeño, hot sauce. Real heat not mild.' : 
              activeFilter === 'unique' ? 
              'Creative, unique, restaurant-style recipes — loaded dishes, fusion, creative sauces. NOT basic boring meals. If recipe has a cultural name like Korean or Mexican it MUST use authentic ingredients from that cuisine.' : 
              'Suggest balanced, healthy recipes.'}

              For steps: be detailed and friendly. Include exact measurements, temperatures, and timings. End with a fun encouraging message.
              
              IMPORTANT: You do NOT need to use ALL the user ingredients. Pick the best 2-4 that work well together for each recipe. The user is telling you what they HAVE available, not what must all be used.

              Assume the user always has: salt, pepper, garlic, olive oil, chili powder, paprika, cumin.
              
              Cooking method: ${activeMethod}. All recipes MUST be cooked using ${activeMethod} only.

              Return ONLY a JSON object, no extra text, no markdown, exactly like this:
              {
                "recipes": [
                  {
                    "name": "Recipe Name",
                    "time": "15 mins",
                    "calories": 400,
                    "protein": 35,
                    "carbs": 20,
                    "fat": 15,
                    "matchScore": 3,
                    "ingredients": ["2 large eggs", "200g chicken breast", "100g spinach"],
                    "steps": "Heat 1 tbsp olive oil in a pan over medium heat. Season 200g chicken breast with salt, pepper and paprika. Cook for 8 minutes each side until golden brown and cooked through. Rest for 2 minutes before slicing. Serve hot and enjoy your meal — you crushed it! 💪"
                ]
              }`
            }
          ],
          max_tokens: 1024,
        })
      }
    )

    const data = await response.json()
    const text = data.choices[0].message.content
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    renderRecipeCards(parsed.recipes)

  } catch (error) {
    recipeGrid.innerHTML = '<p class="placeholder-text">Something went wrong, try again!</p>'
  }
}




function renderRecipeCards(recipes, gridId = 'recipe-grid') {
  const recipeGrid = document.getElementById(gridId)
  recipeGrid.innerHTML = ''

  recipes.forEach(function(recipe) {
    const card = document.createElement('div')
    card.className = 'recipe-card'

    card.style.cursor = 'pointer'
    card.onclick = function() {
        openModal(recipe)
    }

    card.innerHTML = `
      <div class="card-header">
        <h3>${recipe.name}</h3>
        <span class="time">⏱ ${recipe.time}</span>
      </div>

      <div class="macros">
        <div class="macro">
          <span class="macro-value">${recipe.calories}</span>
          <span class="macro-label">kcal</span>
        </div>
        <div class="macro">
          <span class="macro-value">${recipe.protein}g</span>
          <span class="macro-label">protein</span>
        </div>
        <div class="macro">
          <span class="macro-value">${recipe.carbs}g</span>
          <span class="macro-label">carbs</span>
        </div>
        <div class="macro">
          <span class="macro-value">${recipe.fat}g</span>
          <span class="macro-label">fat</span>
        </div>
      </div>

      <div class="match-score">
        Matches ${recipe.matchScore} of your ingredients
      </div>

      <p class="steps">${recipe.steps}</p>

      <button class="save-btn" onclick="event.stopPropagation(); saveRecipe(${JSON.stringify(recipe).replace(/"/g, '&quot;')})">
        ♡ Save Recipe
      </button>
    `

    recipeGrid.appendChild(card)
  })
}


// ===== SAVED RECIPES =====
function saveRecipe(recipe) {
  if (typeof recipe === 'string') {
    recipe = JSON.parse(recipe)
  }

  const alreadySaved = savedRecipes.some(r => r.name === recipe.name)
  if (alreadySaved) {
    alert('Recipe already saved!')
    return
  }

  savedRecipes.push(recipe)
  localStorage.setItem('savedRecipes', JSON.stringify(savedRecipes))
  renderSavedRecipes()

  const allSaveBtns = document.querySelectorAll('.save-btn')
  allSaveBtns.forEach(function(btn) {
    if (btn.closest('.recipe-card').querySelector('h3').innerText === recipe.name) {
      btn.style.background = '#f0a500'
      btn.style.color = '#000'
      btn.innerText = '❤️ Saved!'  
    }
  })
}

function renderSavedRecipes() {
  const savedGrid = document.getElementById('saved-grid')
  savedGrid.innerHTML = ''

  if (savedRecipes.length === 0) {
    savedGrid.innerHTML = '<p class="placeholder-text">No saved recipes yet — hit ♡ to save one!</p>'
    return
  }

  savedRecipes.forEach(function(recipe, index) {
    const card = document.createElement('div')
    card.className = 'recipe-card'

    card.style.cursor = 'pointer'
    card.onclick = function() {
        openModal(recipe)
    }

    card.innerHTML = `
      <div class="card-header">
        <h3>${recipe.name}</h3>
        <span class="time">⏱ ${recipe.time}</span>
      </div>

      <div class="macros">
        <div class="macro">
          <span class="macro-value">${recipe.calories}</span>
          <span class="macro-label">kcal</span>
        </div>
        <div class="macro">
          <span class="macro-value">${recipe.protein}g</span>
          <span class="macro-label">protein</span>
        </div>
        <div class="macro">
          <span class="macro-value">${recipe.carbs}g</span>
          <span class="macro-label">carbs</span>
        </div>
        <div class="macro">
          <span class="macro-value">${recipe.fat}g</span>
          <span class="macro-label">fat</span>
        </div>
      </div>

      <p class="steps">${recipe.steps}</p>


      <button class="tried-btn ${recipe.tried ? 'tried-active' : ''}" onclick="event.stopPropagation(); toggleTried(${index})">
        ${recipe.tried ? '✅ Tried it!' : '⬜ Mark as Tried'}
      </button>

      <button class="remove-btn" onclick="event.stopPropagation(); removeRecipe(${index})">
        🗑 Remove
      </button>
    `

    savedGrid.appendChild(card)
  })
}

function toggleTried(index) {
  savedRecipes[index].tried = !savedRecipes[index].tried
  localStorage.setItem('savedRecipes', JSON.stringify(savedRecipes))
  renderSavedRecipes()
}


function removeRecipe(index) {
  savedRecipes.splice(index, 1)
  localStorage.setItem('savedRecipes', JSON.stringify(savedRecipes))
  renderSavedRecipes()
}

window.addEventListener('load', function() {
  renderSavedRecipes()
})

// ===== MODAL =====
function openModal(recipe) {
  if (typeof recipe === 'string') {
    recipe = JSON.parse(recipe)
  }

  const modal = document.getElementById('recipe-modal')
  const modalContent = document.getElementById('modal-content')

  modalContent.innerHTML = `
    <p class="modal-recipe-name">${recipe.name}</p>
    <p style="color: #aaa; font-size: 1.1rem; margin-bottom: 20px">⏱ ${recipe.time}</p>

    <div class="macros" style="margin-bottom: 20px">
      <div class="macro">
        <span class="macro-value">${recipe.calories}</span>
        <span class="macro-label">kcal</span>
      </div>
      <div class="macro">
        <span class="macro-value">${recipe.protein}g</span>
        <span class="macro-label">protein</span>
      </div>
      <div class="macro">
        <span class="macro-value">${recipe.carbs}g</span>
        <span class="macro-label">carbs</span>
      </div>
      <div class="macro">
        <span class="macro-value">${recipe.fat}g</span>
        <span class="macro-label">fat</span>
      </div>
    </div>

    <div class="modal-ingredients">
      <h4>🛒 Ingredients</h4>
      <ol>
        ${recipe.ingredients.map(ingredient => `<li>${ingredient}</li>`).join('')}
      </ol>
    </div>

    <div class="modal-steps">
      <h4>👨‍🍳 Steps</h4>
      <ol>
        ${recipe.steps.split('.').filter(s => s.trim()).map(step => `<li>${step.trim()}</li>`).join('')}
      </ol>
    </div>
  `

  modal.classList.add('active')
}

function closeModal() {
  document.getElementById('recipe-modal').classList.remove('active')
}

document.getElementById('recipe-modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal()
})


// ===== SIDEBAR NAVIGATION =====
const navBtns = document.querySelectorAll('.nav-btn, .bottom-nav-btn')

navBtns.forEach(function(btn) {
  btn.addEventListener('click', function() {
    // remove active from all nav buttons
    navBtns.forEach(function(b) {
      b.classList.remove('active-nav')
    })

    // remove active from all pages
    document.querySelectorAll('.page').forEach(function(page) {
      page.classList.remove('active-page')
    })

    // add active to clicked button
    btn.classList.add('active-nav')

    // show the correct page
    const pageId = 'page-' + btn.dataset.page
    document.getElementById(pageId).classList.add('active-page')
  })
})



// ===== GOALS =====

document.getElementById('goals-search-btn').addEventListener('click', async function() {
  const meal = document.getElementById('goal-meal').value
  const calMin = document.getElementById('goal-cal-min').value
  const calMax = document.getElementById('goal-cal-max').value
  const protein = document.getElementById('goal-protein').value
  const carbs = document.getElementById('goal-carbs').value
  const fat = document.getElementById('goal-fat').value
  const goalsGrid = document.getElementById('goals-grid')

  if (!calMin && !calMax && !protein) {
    goalsGrid.innerHTML = '<p class="placeholder-text">Please set at least calories or protein!</p>'
    return
  }

  goalsGrid.innerHTML = '<p class="placeholder-text">Finding recipes for your goals... 🎯</p>'

  try {
    const response = await fetch(
      '/api/chat',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
                   // API CAREFUL
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'user',
              content: `You are a fitness recipe assistant. Generate 6 recipes for:
              Meal type: ${meal}.
              Calorie range: ${calMin || 'no minimum'} to ${calMax || 'no maximum'} kcal.
              Minimum protein: ${protein || 'no minimum'}g.
              Max carbs: ${carbs || 'no limit'}g.
              Max fat: ${fat || 'no limit'}g.
              
              Each recipe MUST fit within these targets.
              For steps: be detailed and friendly. Include exact measurements, temperatures, and timings. End with a fun encouraging message.
              Preferred protein sources: ${proteinSources.length > 0 ? proteinSources.join(', ') : 'any protein source'}.
              ONLY use these protein sources in recipes. Do not suggest recipes with other proteins. Each individual recipe should use ONLY ONE of the preferred proteins — don't combine multiple protein sources in the same recipe.
              Assume the user always has: salt, pepper, garlic, olive oil, chili powder, paprika, cumin.
              
              Return ONLY a JSON object, no extra text, no markdown, exactly like this:
              {
                "recipes": [
                  {
                    "name": "Recipe Name",
                    "time": "15 mins",
                    "calories": 750,
                    "protein": 68,
                    "carbs": 45,
                    "fat": 28,
                    "matchScore": 0,
                    "ingredients": ["2 large eggs", "200g chicken breast", "100g spinach", "100g rice"],
                    "steps": "Heat 1 tbsp olive oil in a pan over medium heat. Season 200g chicken breast with salt, pepper and paprika. Cook for 8 minutes each side until golden brown and cooked through. Rest for 2 minutes before slicing. Serve hot and enjoy your meal — you crushed it! 💪"
                  }
                ]
              }`
            }
          ],
          max_tokens: 2048,
        })
      }
    )

    const data = await response.json()
    const text = data.choices[0].message.content
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    renderRecipeCards(parsed.recipes, 'goals-grid')

  } catch (error) {
    goalsGrid.innerHTML = '<p class="placeholder-text">Something went wrong, try again!</p>'
  }
})



// ===== VOICE INPUT =====
const micBtn = document.getElementById('mic-btn')

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const recognition = new SpeechRecognition()

  recognition.lang = 'en-US'
  recognition.continuous = true
  recognition.interimResults = true

  micBtn.addEventListener('click', function() {
    if (isListening) {
        recognition.stop()
        micBtn.classList.remove('listening')
        micBtn.innerText = '🎤'
        isListening = false
    } else {
        micBtn.classList.add('listening')
        micBtn.innerText = '🔴'
        recognition.start()
        isListening = true
    }
  })

  recognition.onresult = function(event) {
    let transcript = ''
    for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript + ' '
    }
    chatInput.value = transcript.trim()
  }

  recognition.onerror = function() {
    micBtn.classList.remove('listening')
    micBtn.innerText = '🎤'
  }

  recognition.onend = function() {
    if (isListening) {
        recognition.start()
    } else {
        micBtn.classList.remove('listening')
        micBtn.innerText = '🎤'
        isListening = false
    }
  }

} else {
  micBtn.style.display = 'none'
}


// ===== PROTEIN SOURCES =====
const customProteinInput = document.getElementById('custom-protein')
const addProteinBtn = document.getElementById('add-protein-btn')
const proteinTagsDiv = document.getElementById('protein-tags')

function renderProteinTags() {
  proteinTagsDiv.innerHTML = ''
  proteinSources.forEach(function(protein, index) {
    const tag = document.createElement('div')
    tag.className = 'tag'
    tag.innerHTML = `${protein} <span onclick="removeProtein(${index})">✕</span>`
    proteinTagsDiv.appendChild(tag)
  })
}

function removeProtein(index) {
  proteinSources.splice(index, 1)
  renderProteinTags()
}

addProteinBtn.addEventListener('click', function() {
  const value = customProteinInput.value.trim().toLowerCase()
  if (value === '') return
  if (proteinSources.includes(value)) return
  proteinSources.push(value)
  customProteinInput.value = ''
  renderProteinTags()
})

customProteinInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') addProteinBtn.click()
})
