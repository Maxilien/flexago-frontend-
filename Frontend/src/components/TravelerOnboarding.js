//frontend/src/components/TravelerOnboarding.js

import React from "react";
import { createConnectedAccount, generateOnboardingLink } from "../api/stripe";

const TravelerOnboarding = () => {

  const handleOnboarding = async () => {
    try {
      const accountId = await createConnectedAccount();
      const onboardingUrl = await generateOnboardingLink(accountId);
      window.location.href = onboardingUrl;
    } catch (err) {
      console.error("Onboarding Error:", err);
      alert("Failed to start onboarding");
    }
  };

  return (
    <button 
      onClick={handleOnboarding}
      style={{
        padding: "12px 20px",
        backgroundColor: "#635bff",
        color: "white",
        borderRadius: "8px",
        border: "none",
        fontSize: "16px",
        cursor: "pointer"
      }}
    >
      Set Up Payouts
    </button>
  );
};

export default TravelerOnboarding;
