"use strict";

const { validationResult } = require("express-validator");
const { AppError } = require("../../errors");

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function validate(rules) {
  return [
    ...rules,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(new AppError(400, errors.array()[0].msg));
      }
      return next();
    },
  ];
}

module.exports = {
  asyncHandler,
  validate,
};
