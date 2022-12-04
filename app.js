var format = require("date-fns/format");
var isValid = require("date-fns/isValid");

const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const hasPriorityAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryAndPriorityProperties = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};

const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};

const checkProperties = (request, response, next) => {
  const { priority, status, category, dueDate } = request.query;
  switch (true) {
    case status !== undefined:
      if (status !== "DONE" && status !== "IN PROGRESS" && status !== "TO DO") {
        response.status(400);
        response.send("Invalid Todo Status");
      } else {
        next();
      }
      break;
    case priority !== undefined:
      if (priority !== "HIGH" && priority !== "MEDIUM" && priority !== "LOW") {
        response.status(400);
        response.send("Invalid Todo Priority");
      } else {
        next();
      }
      break;
    case category !== undefined:
      if (
        category !== undefined &&
        category !== "WORK" &&
        category !== "HOME" &&
        category !== "LEARNING"
      ) {
        response.status(400);
        response.send("Invalid Todo Category");
      } else {
        next();
      }
      break;
    case dueDate !== undefined:
      var result = isValid(new Date(dueDate));
      if (result) {
        next();
      } else {
        response.status(400);
        response.send("Invalid Due Date");
      }
      break;
  }
};

app.get("/todos/", checkProperties, async (request, response) => {
  let data = null;
  let getTodosQuery = "";
  const { search_q = "", priority, status, category } = request.query;

  switch (true) {
    case hasPriorityAndStatusProperties(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND priority = '${priority}';`;
      break;
    case hasCategoryAndStatusProperties(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND category = '${category}';`;
      break;
    case hasCategoryAndPriorityProperties(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND priority = '${priority}'
        AND category = '${category}';`;
      break;
    case hasPriorityProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND priority = '${priority}';`;
      break;
    case hasStatusProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}';`;
      break;
    case hasCategoryProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND category = '${category}';`;
      break;
    default:
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%';`;
  }

  data = await database.all(getTodosQuery);
  response.send(data);
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  const getTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE
      id = ${todoId};`;
  const todo = await database.get(getTodoQuery);
  response.send(todo);
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;

  var result = isValid(new Date(date));
  if (result) {
    const formatDate = format(new Date(date), "yyyy-MM-dd");
    const getAgendaQuery = `
    SELECT
      *
    FROM
      todo
    WHERE
      due_date = '${date}';`;
    const todoAgenda = await database.get(getAgendaQuery);
    response.send(todoAgenda);
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  var result = isValid(new Date(dueDate));
  if (
    status !== undefined &&
    status !== "DONE" &&
    status !== "IN PROGRESS" &&
    status !== "TO DO"
  ) {
    response.status(400);
    response.send("Invalid Todo Status");
  }

  if (
    priority !== undefined &&
    priority !== "HIGH" &&
    priority !== "MEDIUM" &&
    priority !== "LOW"
  ) {
    response.status(400);
    response.send("Invalid Todo Priority");
  }
  if (
    category !== undefined &&
    category !== "WORK" &&
    category !== "HOME" &&
    category !== "LEARNING"
  ) {
    response.status(400);
    response.send("Invalid Todo Category");
  }
  if (result === false) {
    response.status(400);
    response.send("Invalid Due Date");
  }

  const postTodoQuery = `
  INSERT INTO
    todo (id, todo, priority, status)
  VALUES
    (${id}, '${todo}', '${priority}', '${status}');`;
  await database.run(postTodoQuery);
  response.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let updateColumn = "";
  const requestBody = request.body;
  switch (true) {
    case requestBody.status !== undefined:
      if (
        requestBody.status !== "DONE" &&
        requestBody.status !== "IN PROGRESS" &&
        requestBody.status !== "TO DO"
      ) {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      updateColumn = "Status";

      break;
    case requestBody.priority !== undefined:
      if (
        requestBody.priority !== "HIGH" &&
        requestBody.priority !== "MEDIUM" &&
        requestBody.priority !== "LOW"
      ) {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      updateColumn = "Priority";

      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
    case requestBody.category !== undefined:
      if (
        requestBody.category !== undefined &&
        requestBody.category !== "WORK" &&
        requestBody.category !== "HOME" &&
        requestBody.category !== "LEARNING"
      ) {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      updateColumn = "Category";

      break;
    case requestBody.dueDate !== undefined:
      var result = isValid(new Date(requestBody.dueDate));
      if (result === false) {
        response.status(400);
        response.send("Invalid Due Date");
      }
      updateColumn = "Due Date";

      break;
  }
  const previousTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE 
      id = ${todoId};`;
  const previousTodo = await database.get(previousTodoQuery);

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body;

  const updateTodoQuery = `
    UPDATE
      todo
    SET
      todo='${todo}',
      priority='${priority}',
      status='${status}',
      category='${category}',
      due_date='${dueDate}'
    WHERE
      id = ${todoId};`;

  await database.run(updateTodoQuery);
  response.send(`${updateColumn} Updated`);
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
  DELETE FROM
    todo
  WHERE
    id = ${todoId};`;

  await database.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
