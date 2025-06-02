
const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /orders handlers needed to make the tests pass
function list(req, res) {
  res.json({ data: orders });
}


function bodyDataHas(propertyName) {
  return function (req, res, next) {
    const { data = {} } = req.body;
    if (data[propertyName]) {
      return next();
    }
    next({
        status: 400,
        message: `Must include a ${propertyName}`
    });
  };
}

function quantityIsValid(req, res, next) {
  const { data: { dishes } = {} } = req.body;

  if (!Array.isArray(dishes) || dishes.length === 0) {
    return next({
      status: 400,
      message: "dishes must be a non-empty array",
    });
  }

  for (let i = 0; i < dishes.length; i++) {
    const dish = dishes[i];
    if (
      typeof dish.quantity !== "number" ||
      dish.quantity <= 0 ||
      !Number.isInteger(dish.quantity)
    ) {
      return next({
        status: 400,
        message: `Dish ${i} must have a quantity that is an integer greater than 0`,
      });
    }
  }

  next();
}

function validateIdMatch(req, res, next) {
  const { orderId } = req.params;
  const { id } = req.body.data || {};

  // Store the id from the request body into res.locals
  res.locals.bodyId = id;

  if (!id || id === orderId) {
    return next(); 
  }

  next({
    status: 400,
    message: `order id does not match route id. order: ${id}, Route: ${orderId}`,
  });
}


function create(req, res, next) {
  const { data: { deliverTo, mobileNumber, status = "pending", dishes } = {} } = req.body;

  const newOrder = {
    id: nextId(),
    deliverTo,
    mobileNumber,
    status,
    dishes,
  };

  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}



function orderExists(req, res, next) {
  const { orderId } = req.params;
  const foundorder = orders.find(order => order.id === orderId);
  if (foundorder) {
    res.locals.order = foundorder;
    return next();
  }
  next({
    status: 404,
    message: `order does not exist: ${orderId}`,
  });
};

function read(req, res) {
  res.json({ data: res.locals.order });
}


function update(req, res, next) {
  const order = res.locals.order;
  const { data: { deliverTo, mobileNumber, status, dishes } = {} } = req.body;

  if (!["pending", "preparing", "out-for-delivery", "delivered"].includes(status)) {
    return next({
      status: 400,
      message: "Order must have a valid status.",
    });
  }

  if (order.status === "delivered") {
    return next({
      status: 400,
      message: "A delivered order cannot be changed.",
    });
  }

  order.deliverTo = deliverTo;
  order.mobileNumber = mobileNumber;
  order.status = status;
  order.dishes = dishes;

  res.json({ data: order });
}



function destroy(req, res, next) {
  const order = res.locals.order;

  if (order.status !== "pending") {
    return next({
      status: 400,
      message: "An order cannot be deleted unless it is pending.",
    });
  }

  const index = orders.findIndex((o) => o.id === order.id);
  orders.splice(index, 1);
  res.sendStatus(204);
}


module.exports = {
  create: [
    bodyDataHas("deliverTo"),
    bodyDataHas("mobileNumber"),
    bodyDataHas("dishes"),
    quantityIsValid,
    create,
  ],
  list,
  read: [orderExists, read],
  update: [
    orderExists,
    bodyDataHas("deliverTo"),
    bodyDataHas("mobileNumber"),
    bodyDataHas("dishes"),
    quantityIsValid,
    validateIdMatch,
    update,
  ],

  delete: [orderExists, destroy],
};