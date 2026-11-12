
"use strict";

const API_URL = "http://localhost:5000/api/tasks";

const taskList = document.querySelector("#task-list");
const taskInput = document.querySelector("#task-input");
const addForm = document.querySelector("#add-form");
const emptyState = document.querySelector("#empty-state");
const filterButtons = document.querySelectorAll(".filter-button");
const todayLabel = document.querySelector("#today-label");
const taskSummary = document.querySelector("#task-summary");
const allCount = document.querySelector("#all-count");
const remainingLabel = document.querySelector("#remaining-label");
const progressRing = document.querySelector("#progress-ring");
const progressValue = document.querySelector("#progress-value");
const clearCompletedButton = document.querySelector("#clear-completed");

let tasks = [];
let activeFilter = "all";
let editingTaskId = null;

// Convert MongoDB task into frontend format
function formatTask(task) {
  return {
    id: task._id,
    text: task.title,
    completed: task.completed
  };
}

// LOAD TASKS FROM MONGODB
async function loadTasks() {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error("Could not load tasks.");
    }

    const data = await response.json();
    tasks = data.map(formatTask);
    renderTasks();

  } catch (error) {
    console.error("Loading error:", error);
    alert("Unable to load tasks. Make sure the backend server is running.");
  }
}

// UPDATE DATE LABEL
function updateDateLabel() {
  todayLabel.textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(new Date()).toUpperCase();
}

// DISPLAY TASKS
function renderTasks() {
  const completedCount = tasks.filter(task => task.completed).length;
  const remainingCount = tasks.length - completedCount;

  const visibleTasks = tasks.filter(task => {
    if (activeFilter === "active") return !task.completed;
    if (activeFilter === "completed") return task.completed;
    return true;
  });

  taskList.replaceChildren();

  visibleTasks.forEach(task => {
    const item = document.createElement("li");
    item.className = `task-item${task.completed ? " completed" : ""}`;

    if (task.id === editingTaskId) {
      const editForm = document.createElement("form");
      editForm.className = "task-edit-form";

      const editInput = document.createElement("input");
      editInput.type = "text";
      editInput.maxLength = 160;
      editInput.value = task.text;
      editInput.required = true;

      const saveButton = document.createElement("button");
      saveButton.type = "submit";
      saveButton.className = "edit-task save-task";
      saveButton.textContent = "Save";

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "edit-task cancel-task";
      cancelButton.textContent = "Cancel";

      cancelButton.addEventListener("click", () => {
        editingTaskId = null;
        renderTasks();
      });

      editForm.addEventListener("submit", async event => {
        event.preventDefault();

        const text = editInput.value.trim();
        if (!text) return editInput.focus();

        try {
          const response = await fetch(`${API_URL}/${task.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: text })
          });

          if (!response.ok) throw new Error("Update failed.");

          const updatedTask = await response.json();

          tasks = tasks.map(current =>
            current.id === task.id ? formatTask(updatedTask) : current
          );

          editingTaskId = null;
          renderTasks();

        } catch (error) {
          console.error(error);
          alert("Unable to update task.");
        }
      });

      editForm.append(editInput, saveButton, cancelButton);
      item.append(editForm);
      taskList.append(item);

      editInput.focus();
      editInput.select();
      return;
    }

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "task-toggle";
    toggle.setAttribute(
      "aria-label",
      task.completed ? `Mark ${task.text} as active` : `Mark ${task.text} as completed`
    );
    toggle.setAttribute("aria-pressed", String(task.completed));

    if (task.completed) {
      const checkmark = document.createElement("span");
      checkmark.textContent = "✓";
      toggle.append(checkmark);
    }

    toggle.addEventListener("click", () => toggleTask(task.id));

    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.text;

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-task";
    remove.textContent = "Delete";
    remove.setAttribute("aria-label", `Delete ${task.text}`);
    remove.addEventListener("click", () => deleteTask(task.id));

    if (!task.completed) {
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "edit-task";
      edit.textContent = "Edit";
      edit.setAttribute("aria-label", `Edit ${task.text}`);
      edit.addEventListener("click", () => {
        editingTaskId = task.id;
        renderTasks();
      });

      actions.append(edit);
    }

    actions.append(remove);
    item.append(toggle, text, actions);
    taskList.append(item);
  });

  allCount.textContent = String(tasks.length);
  remainingLabel.textContent =
    `${remainingCount} ${remainingCount === 1 ? "task" : "tasks"} left`;

  taskSummary.textContent = tasks.length === 0
    ? "Let’s make today count."
    : `${completedCount} of ${tasks.length} ${tasks.length === 1 ? "task" : "tasks"} complete`;

  const progress = tasks.length === 0
    ? 0
    : Math.round((completedCount / tasks.length) * 100);

  progressValue.textContent = `${progress}%`;
  progressRing.style.setProperty("--progress", `${progress}%`);
  progressRing.setAttribute("aria-label", `${progress}% complete`);

  emptyState.classList.toggle("visible", visibleTasks.length === 0);
  clearCompletedButton.hidden = completedCount === 0;
}

// ADD TASK
addForm.addEventListener("submit", async event => {
  event.preventDefault();

  const text = taskInput.value.trim();

  if (!text) {
    taskInput.focus();
    return;
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: text,
        priority: "Medium"
      })
    });

    if (!response.ok) throw new Error("Could not add task.");

    const savedTask = await response.json();

    tasks.unshift(formatTask(savedTask));

    activeFilter = "all";
    updateFilterButtons();
    renderTasks();

    addForm.reset();
    taskInput.focus();

  } catch (error) {
    console.error(error);
    alert("Unable to add task. Please check your server.");
  }
});

// COMPLETE OR UNCOMPLETE TASK
async function toggleTask(id) {
  const task = tasks.find(task => task.id === id);
  if (!task) return;

  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed })
    });

    if (!response.ok) throw new Error("Could not update task.");

    const updatedTask = await response.json();

    tasks = tasks.map(current =>
      current.id === id ? formatTask(updatedTask) : current
    );

    renderTasks();

  } catch (error) {
    console.error(error);
    alert("Unable to update task.");
  }
}

// DELETE TASK
async function deleteTask(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "DELETE"
    });

    if (!response.ok) throw new Error("Could not delete task.");

    tasks = tasks.filter(task => task.id !== id);
    renderTasks();

  } catch (error) {
    console.error(error);
    alert("Unable to delete task.");
  }
}

// FILTER BUTTONS
function updateFilterButtons() {
  filterButtons.forEach(button => {
    const isActive = button.dataset.filter === activeFilter;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

filterButtons.forEach(button => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    updateFilterButtons();
    renderTasks();
  });
});

// CLEAR COMPLETED TASKS
clearCompletedButton.addEventListener("click", async () => {
  const completedTasks = tasks.filter(task => task.completed);

  try {
    for (const task of completedTasks) {
      const response = await fetch(`${API_URL}/${task.id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Could not clear completed tasks.");
      }
    }

    tasks = tasks.filter(task => !task.completed);
    renderTasks();

  } catch (error) {
    console.error(error);
    alert("Unable to clear all completed tasks. Please refresh and try again.");
    await loadTasks();
  }
});

// INITIALIZE APP
updateDateLabel();
loadTasks();
