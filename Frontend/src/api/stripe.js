//frontend/src/api/stripe.js
import axios from "axios";

export const createConnectedAccount = async () => {
  const res = await axios.post("/api/stripe/create-connected-account");
  return res.data.accountId;
};

export const generateOnboardingLink = async (accountId) => {
  const res = await axios.post("/api/stripe/account-link", { accountId });
  return res.data.url;
};
