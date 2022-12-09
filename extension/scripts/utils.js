const IS_PROD = process.env.NODE_ENV === "production"
const IS_DEV = !IS_PROD

module.exports = {
  IS_PROD,
  IS_DEV,
}
