//customer routes
const express = require("express");
const uploadMiddleware = require("../middlewares/upload");
const uploadMiddleware2 = require("../middlewares/upload2");
const {
	getWalletDetails,
	requestWithdrawal,
	getTransactions,
	getReferralStats,
} = require("../controllers/walletController");

const {
	registerCustomer,
	loginUser,
	getServiceById,
	initiatePayment,
	getUserServices,
	getCustomerDashboard,
	handlePaymentSuccess,
	updateCustomerProfile,
	uploadDocuments,
	sendQuery,
	getCustomerQueriesWithReplies,
	submitFeedback,
	updateBankDetails,
	registerFlexiCustomer,
	processFlexiFunnelRedirect,
	googleRegister,
	// Add the new controller functions for password reset
	forgotPassword,
	resetPassword,
	verifyResetToken,
	checkEmailAvailability,
} = require("../controllers/customerController");

// const customerAuthMiddleware = require('../middlewares/customerAuthMiddleware');
const { createLead } = require('../controllers/leadController');

const router = express.Router();

router.get("/cdashboard", getCustomerDashboard);
// Service details
router.get("/user-services/:serviceId", getServiceById);

// Customer registration
router.post("/user-register", registerCustomer);
router.post("/flexi-register", registerFlexiCustomer);
router.post("/google-register", googleRegister);
// Customer login
router.post("/user-login", loginUser);

// Password reset routes
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/verify-reset-token/:token", verifyResetToken);

// Initiate payment
router.post("/user-payment", initiatePayment);
router.get("/user-services", getUserServices);
router.post("/payment-success", handlePaymentSuccess);
router.put("/update-profile", updateCustomerProfile);
router.post(
	"/upload-documents",
	uploadMiddleware2,
	uploadDocuments
);
router.post("/sendQuery", uploadMiddleware2, sendQuery);
router.get("/queries/:userId", getCustomerQueriesWithReplies);
// Route to fetch customer queries by user ID
router.post("/feedback", submitFeedback);



//wallet
router.get("/wallet", getWalletDetails);
router.post("/wallet/withdraw", requestWithdrawal);
router.get("/wallet/transactions", getTransactions);
router.get("/wallet/referral/stats", getReferralStats);

router.post("/update-bank-details", updateBankDetails);
// In customerRoutes.js, add a test route
router.get("/wallet/test", (req, res) => {
	res.json({ message: "Wallet routes are working", user: req.user });
});

// Lead creation route (supports both guests and logged-in users)
router.post('/lead', createLead);

// Email validation route (no auth required)
router.get("/check-email", checkEmailAvailability);

module.exports = router;
