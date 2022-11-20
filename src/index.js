/* eslint-disable func-names */
const validatorJS = require('validator');

const validatorKeys = Object.keys(validatorJS).filter(key => key.startsWith('is'));
validatorKeys.push('contains', 'equals', 'matches');

let errors = {};

function convertToErrorList(error = {}) {
  const keys = Object.keys(error);
  const allError = [];
  for (let i = 0; i < keys.length; i++) {
    allError.push(error[keys[i]]);
  }
  return allError;
}

module.exports = {
  validator(rules, next) {
    const middleware = (parent, args, context, info) => {
      rules.forEach((func) => {
        func.exec(args);
      });

      if (errors.hasError) {
        const ctx = context;
        delete errors.hasError
        ctx.validationErrors = errors;
        ctx.validationErrorsList = convertToErrorList(errors);
        errors = {};
      }

      return next(parent, args, context, info);
    };

    return middleware;
  },

  validate(param, input) {
    const obj = {
      callbackFuncs: [],
      isNegateNext: false,
      methods: {
        not() {
          const func = () => {
            obj.isNegateNext = true;
          };

          obj.callbackFuncs.push(func);

          return this;
        },
        exec(args) {
          const params = input ? args[input] : args;

          obj.callbackFuncs.forEach((func) => {
            func(params);
          });
        },
      },
    };

    validatorKeys.forEach((key) => {
      obj.methods[key] = function (config = {}) {
        const func = (args = { [param]: '' }) => {
          const validationResult = validatorJS[key](`${args[param]}`, config.options);
          const isError = !obj.isNegateNext ? !validationResult : validationResult;

          if (isError) {
            const msg = config.msg || 'Invalid value'
            if (errors[param]) {
              errors[param].push(msg)
            }
            else {
              errors[param] = [msg];
            }
            errors.hasError = true;
          }

          obj.isNegateNext = false;
        };

        obj.callbackFuncs.push(func);

        return obj.methods;
      };
    });

    return obj.methods;
  },
};
