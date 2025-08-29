import DodoPayments from "dodopayments";

// Use DODO_ENVIRONMENT to override the default NODE_ENV behavior
// This allows you to test production payments locally by setting DODO_ENVIRONMENT=production
const dodoEnvironment = process.env.DODO_ENVIRONMENT || 
  (process.env.NODE_ENV === "development" ? "development" : "production");

const isTestMode = dodoEnvironment === "development";
const selectedToken = isTestMode 
  ? process.env.DODO_API_KEY_TEST 
  : process.env.DODO_API_KEY_LIVE;
const selectedEnvironment = isTestMode ? "test_mode" : "live_mode";

export const dodopayments = new DodoPayments({
  bearerToken: selectedToken,
  environment: selectedEnvironment,
});