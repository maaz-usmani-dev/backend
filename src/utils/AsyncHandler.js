// Using Async/Await

const asyncHandler = (func) => async (req, res, next) => {
  try {
    await func(req, res, next);
  } catch (error) {
    res.status(error.code || 500).json({
      success: false,
      message: error.message,
    });
  }
};
export { asyncHandler };

// // Using Promises

// const asyncHandler = (func) => {
//    return (req, res, next) => {
//         Promise.resolve(func(req, res, next))
//         .catch((err) => next(err))
//     }
// }

// export {asyncHandler}
