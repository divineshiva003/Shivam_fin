import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "../Admin/utils/axiosConfig";
import ClipLoader from "react-spinners/ClipLoader";
import { useNotification } from "../NotificationContext";
import { useRef } from "react";
const CustomerAuthContext = createContext();

export const CustomerAuthProvider = ({ children }) => {
	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [services, setServices] = useState([]);
	const [serviceMap, setServiceMap] = useState({});
	const [employeeMap, setEmployeeMap] = useState({});
	const [error, setError] = useState(null);
	const [message, setMessage] = useState("");
	const [queries, setQueries] = useState([]);

	const [formData, setFormData] = useState({
		pan: "",
		gst: "",
		address: "",
		city: "",
		state: "",
		country: "",
		postalcode: "",
		natureEmployement: "",
		annualIncome: "",
		education: "",
		certifications: "",
		institute: "",
		completiondate: "",
	});

	const { showNotification, setCurrentPage } = useNotification();

	const isInitialLoad = useRef(true);

	useEffect(() => {
		setCurrentPage("customer");
	}, [setCurrentPage]);

	const [isEditing, setIsEditing] = useState(
		Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: false }), {})
	);

	useEffect(() => {
		const checkLoginStatus = async () => {
			setLoading(true);
			const storedUser = localStorage.getItem("customerUser");
			
			if (storedUser) {
				try {
					const userData = JSON.parse(storedUser);
					setIsLoggedIn(true);
					setUser(userData);
					await fetchCustomerDashboard();
				} catch (err) {
					console.error("Failed to parse stored user data:", err);
					localStorage.removeItem("customerUser");
					setIsLoggedIn(false);
				}
			} else {
				setIsLoggedIn(false);
			}
			setLoading(false);
		};

		checkLoginStatus();
	}, []);

	const login = async (email, password) => {
		setLoading(true);
		setError(null);

		try {
			const { data } = await axios.post(
				"http://localhost:8000/api/customers/user-login",
				{ email, password }
			);
			
			if (!data.success || !data.user) {
				throw new Error("Invalid login response from server.");
			}

			localStorage.setItem("customerUser", JSON.stringify(data.user));
			setIsLoggedIn(true);
			setUser(data.user);
			setServices(data.user.services || []);
			await fetchCustomerDashboard();
			return { success: true };
		} catch (err) {
			handleErrorResponse(err, "Login failed");
			return { success: false, message: err.message };
		} finally {
			setLoading(false);
		}
	};

	// Google login method
	const googleLogin = async (userData) => {
		setLoading(true);
		setError(null);
		
		try {
			const { data } = await axios.post(
				"http://localhost:8000/api/customers/google-register",
				userData
			);
			
			if (!data.success || !data.user) {
				throw new Error("Invalid Google login response from server.");
			}
			
			localStorage.setItem("customerUser", JSON.stringify(data.user));
			setIsLoggedIn(true);
			setUser(data.user);
			await fetchCustomerDashboard();
			return { success: true, userId: data.user._id, email: userData.email };
		} catch (err) {
			handleErrorResponse(err, "Google login failed");
			return { success: false, message: err.message };
		} finally {
			setLoading(false);
		}
	};

	const fetchCustomerDashboard = async () => {
		if (!user || !user._id) {
			const storedUser = localStorage.getItem("customerUser");
			if (!storedUser) {
				showNotification(
					"Please log in to access dashboard.",
					"error",
					"customer"
				);
				setError("Please log in to access dashboard.");
				return;
			}
			try {
				const userData = JSON.parse(storedUser);
				setUser(userData);
			} catch (err) {
				console.error("Failed to parse stored user:", err);
				logout();
				return;
			}
		}

		try {
			setLoading(true);
			const currentUser = user || JSON.parse(localStorage.getItem("customerUser"));
			const { data } = await axios.get(
				`http://localhost:8000/api/customers/cdashboard?userId=${currentUser._id}`
			);

			setUser(data.user);
			console.log("user", data.user);

			// Add the formatted services mapping
			const formattedServices = data.user.services.map((service) => {
				// Check if feedback data directly comes from backend
				const serviceFeedback = service.feedback && service.feedback.length > 0 
					? service.feedback[0] 
					: null;
				
				// Extract tax information
				const igst = parseFloat(service.igst || 0);
				const cgst = parseFloat(service.cgst || 0);
				const sgst = parseFloat(service.sgst || 0);
				const price = parseFloat(service.price || 0);
				const discount = parseFloat(service.discount || 0);
				const paymentAmount = parseFloat(service.paymentAmount || price || 0);
				
				// Employee info should now come directly from the backend
				const employeeName = service.employeeName || null;
				
				console.log('Service details:', {
					id: service.orderId,
					employeeId: service.employeeId,
					employeeName: service.employeeName,
					feedback: service.feedback,
					igst, 
					cgst, 
					sgst,
					price,
					paymentAmount,
					totalTax: igst + cgst + sgst,
					totalWithTax: price + igst + cgst + sgst
				});
				
				return {
					orderId: service.orderId,
					serviceId: service.serviceId,
					serviceName: service.serviceName,
					packageName: service.packageName || null,
					price: price,
					serviceDescription: service.serviceDescription || "N/A",
					purchasedAt: service.purchasedAt || null,
					dueDate: service.dueDate || null,
					status: service.status || "N/A",
					activationStatus: service.activationStatus || "Inactive",
					
					// Employee information - use values directly from backend
					managedBy: service.managedBy || "Not Assigned",
					employeeId: service.employeeId || null, 
					employeeName: employeeName,
					
					requiredDocuments: service.requiredDocuments || [],
					documents: service.documents || [],
					
					// Tax information
					igst: igst,
					cgst: cgst,
					sgst: sgst,
					
					// Payment information
					paymentAmount: paymentAmount,
					paymentMethod: service.paymentMethod || "N/A",
					paymentReference: service.paymentReference || "N/A",
					
					// Discount information
					discount: discount,
					
					// Completion date
					completionDate: service.completionDate || null,
					
					// Feedback information - get directly from service object
					feedback: service.feedback || [],
					hasRating: serviceFeedback ? true : false,
					rating: serviceFeedback ? serviceFeedback.rating : null,
					feedbackText: serviceFeedback ? serviceFeedback.feedback : null
				};
			});

			setServices(formattedServices);
			console.log("Processed services with tax and feedback:", formattedServices);
			setFormData((prev) => ({
				...prev,
				pan: data.user.pan || "",
				// Update other fields similarly
			}));

			await fetchServiceAndEmployeeMaps(token);

			await fetchQueries();

			// showNotification(
			// 	"Customer Dashboard loaded successfully.",
			// 	"success",
			// 	"customer"
			// );
		} catch (error) {
			showNotification("Failed to load dashboard data", "error");
			handleErrorResponse(error, "Failed to load dashboard data");
		} finally {
			setLoading(false);
		}
	};

	const fetchServiceAndEmployeeMaps = async () => {
		if (!user || !user._id) return;
		try {
			const serviceResponse = await axios.get(
				`http://localhost:8000/api/customers/user-services?userId=${user._id}`
			);

			const services = serviceResponse.data.services || [];
			console.log("Fetched services:", services); // Add this line to debug

			const serviceData = services.reduce((map, service) => {
				map[service.serviceId] = service.name;
				return map;
			}, {});
			console.log("Service Map:", serviceData); // Debug the serviceMap

			setServiceMap(serviceData);
		} catch (error) {
			console.error("Error fetching service or employee mappings:", error);
		}
	};

	const logout = () => {
		localStorage.removeItem("customerUser");
		showNotification("Logged Out Successfully", "success");
		setIsLoggedIn(false);
		setUser(null);
		setServices([]);
	};

	const handleErrorResponse = (error, defaultMessage) => {
		if (error.response?.status === 401) {
			logout();
			showNotification(
				"Unauthorized access. Please log in again",
				"error",
				"customer"
			);
			setError("Unauthorized access. Please log in again");
		} else {
			setError(error.response?.data?.message || defaultMessage);
		}
	};

	const getAllServicesForCDash = async () => {
		if (!user || !user._id) {
			showNotification("Please log in to fetch services", "error");
			return [];
		}

		try {
			const { data } = await axios.get(
				`http://localhost:8000/api/customers/user-services?userId=${user._id}`
			);
			return data.services || [];
		} catch (error) {
			showNotification("Failed to fetch services", "error");
			handleErrorResponse(error, "Failed to fetch services");
			return [];
		}
	};

	const uploadDocuments = async (serviceId, files) => {
		if (!user || !user._id) {
			showNotification(
				"Please log in to upload documents.",
				"error",
				"customer"
			);
			throw new Error("No user found");
		}

		const formData = new FormData();
		formData.append("serviceId", serviceId);
		formData.append("userId", user._id);

		// Convert files object to array and append to formData
		Object.values(files).forEach((file) => {
			formData.append("files", file);
		});

		try {
			const { data } = await axios.post(
				"http://localhost:8000/api/customers/upload-documents",
				formData,
				{
					headers: {
						"Content-Type": "multipart/form-data",
					},
				}
			);

			// Fetch updated dashboard data
			await fetchCustomerDashboard();

			showNotification(
				"Documents uploaded successfully",
				"success",
				"customer"
			);
			return data;
		} catch (error) {
			const errorMessage = error.response?.data?.message || "Upload failed";
			showNotification(errorMessage, "error");
			throw error;
		}
	};

	const fetchQueries = async () => {
		if (!user || !user._id) {
			showNotification("Please log in to fetch queries", "error");
			return [];
		}
		try {
			const response = await axios.get(
				`http://localhost:8000/api/customers/queries/${user._id}`
			);

			if (response.data?.queries) {
				setQueries(response.data.queries);

				console.log("Queries fetched successfully", response.data.queries);
				return response.data.queries; // Return the fetched queries
			} else {
				showNotification("Failed to fetch queries", "error");
				console.error("Unexpected API response format", response.data);
				return []; // Return empty array if data is not in expected format
			}
		} catch (error) {
			const errorMessage =
				error.response?.data?.message || "Failed to fetch queries";
			showNotification(errorMessage, "error");
			console.error("Error fetching queries:", errorMessage);
			return []; // Return empty array on error
		}
	};

	const sendQuery = async (formData) => {
		try {
			const response = await axios.post(
				"http://localhost:8000/api/customers/sendQuery",
				formData,
				{
					headers: {
						"Content-Type": "multipart/form-data",
					},
				}
			);

			showNotification(response.data.message, "success");
			setMessage(response.data.message);
			await fetchQueries();
			return true;
		} catch (err) {
			const errorMessage =
				err.response?.data?.message || "Something went wrong";
			showNotification(errorMessage, "error");
			setError(errorMessage);
			return false;
		}
	};

	//customer auth context functions
	// Add these to your existing state in CustomerAuthContext
	const [wallet, setWallet] = useState(null);
	const [referralStats, setReferralStats] = useState(null);

	// Add these functions to your context value
	const fetchWalletDetails = async () => {
		if (!user || !user._id) {
			showNotification("Please log in to access wallet", "error");
			return null;
		}
		try {
			const response = await axios.get(
				`http://localhost:8000/api/customers/wallet?userId=${user._id}`
			);
			setWallet(response.data.wallet);
			return response.data.wallet;
		} catch (error) {
			showNotification("Failed to fetch wallet details", "error");
			throw error;
		}
	};

	const requestWithdrawal = async (amount) => {
		if (!user || !user._id) {
			showNotification("Please log in to request withdrawal", "error");
			return null;
		}
		try {
			const response = await axios.post(
				"http://localhost:8000/api/customers/wallet/withdraw",
				{ amount, userId: user._id }
			);
			await fetchWalletDetails(); // Refresh wallet data
			showNotification(
				"Withdrawal request submitted successfully",
				"success",
				"customer"
			);
			return response.data;
		} catch (error) {
			showNotification(
				error.response?.data?.message || "Failed to process withdrawal",
				"error",
				"customer"
			);
			throw error;
		}
	};

	const fetchReferralStats = async () => {
		if (!user || !user._id) {
			showNotification("Please log in to access referral stats", "error");
			return null;
		}
		try {
			const response = await axios.get(
				`http://localhost:8000/api/customers/wallet/referral/stats?userId=${user._id}`
			);
			console.log("Referral Stats Response:", response.data.stats); // Add this log
			setReferralStats(response.data.stats);
			return response.data.stats;
		} catch (error) {
			showNotification("Failed to fetch referral stats", "error");
			throw error;
		}
	};

	const [messages, setMessages] = useState([]);

	useEffect(() => {
		let interval;
		fetchMessages();
		interval = setInterval(fetchMessages, 1000);
		return () => clearInterval(interval);
	}, []);

	const fetchMessages = async () => {
		if (!user || !user._id) {
			setError("Please log in to access messages.");
			return;
		}
		try {
			const response = await axios.get(
				`http://localhost:8000/api/messages?customerId=${user._id}`
			);
			setMessages(response.data.messages);
			console.log("messages", response.data.messages);
		} catch (err) {
			console.error("Error fetching messages:", err);
			setError("Failed to load messages.");
		}
	};

	// Add function to update bank details
	const updateBankDetails = async (bankDetails) => {
		if (!user || !user._id) {
			showNotification("Please log in to update bank details.", "error");
			return { success: false };
		}

		try {
			setLoading(true);
			const response = await axios.post(
				"http://localhost:8000/api/customers/update-bank-details",
				{
					bankDetails,
					userId: user._id,
				}
			);

			if (response.data) {
				// Update user state with the new bank details
				setUser(prev => ({
					...prev,
					bankDetails: bankDetails
				}));
				
				showNotification("Bank details updated successfully", "success");
				return { success: true };
			} else {
				showNotification("Failed to update bank details", "error");
				return { success: false };
			}
		} catch (error) {
			handleErrorResponse(error, "Failed to update bank details");
			return { success: false };
		} finally {
			setLoading(false);
		}
	};

	// Function to handle forgot password request
	const forgotPassword = async (email) => {
		setLoading(true);
		setError(null);

		try {
			const { data } = await axios.post(
				"http://localhost:8000/api/customers/forgot-password",
				{ email }
			);
			
			return { success: true, message: data.message || "Password reset email sent successfully." };
		} catch (err) {
			handleErrorResponse(err, "Failed to send password reset email");
			return { 
				success: false, 
				message: err.response?.data?.message || err.message || "Failed to send password reset email" 
			};
		} finally {
			setLoading(false);
		}
	};

	// Function to handle reset password with token
	const resetPassword = async (token, newPassword) => {
		setLoading(true);
		setError(null);

		try {
			const { data } = await axios.post(
				"http://localhost:8000/api/customers/reset-password",
				{ token, password: newPassword }
			);
			
			return { success: true, message: data.message || "Password reset successful. You can now log in with your new password." };
		} catch (err) {
			handleErrorResponse(err, "Failed to reset password");
			return { 
				success: false, 
				message: err.response?.data?.message || err.message || "Failed to reset password" 
			};
		} finally {
			setLoading(false);
		}
	};

	return (
		<CustomerAuthContext.Provider
			value={{
				messages,
				setMessages,
				fetchMessages,

				wallet,
				referralStats,
				fetchWalletDetails,
				requestWithdrawal,
				fetchReferralStats,
				fetchQueries,
				sendQuery,
				uploadDocuments,

				message,
				isLoggedIn,
				user,

				loading,
				setLoading,

				services,
				serviceMap,
				employeeMap,
				formData,
				isEditing,
				login,
				googleLogin,
				logout,
				fetchCustomerDashboard,
				getAllServicesForCDash,
				setFormData,
				handleInputChange: (e) =>
					setFormData({ ...formData, [e.target.name]: e.target.value }),
				handleEditClick: (field) =>
					setIsEditing((prev) => ({ ...prev, [field]: true })),
				handleSaveProfile: async () => {
					if (!user || !user._id) {
						showNotification(
							"Please log in to update profile.",
							"error",
							"customer"
						);
						return;
					}

					setLoading(true);
					try {
						const { data } = await axios.put(
							"http://localhost:8000/api/customers/update-profile",
							{ ...formData, userId: user._id }
						);
						setLoading(true);
						setUser(data.user);
						await fetchCustomerDashboard();
						setIsEditing(
							Object.keys(isEditing).reduce(
								(acc, key) => ({ ...acc, [key]: false }),
								{}
							)
						);
						showNotification("Profile updated successfully!", "success");
						setLoading(false);
					} catch (err) {
						handleErrorResponse(
							err,
							"An error occurred while updating the profile."
						);
						showNotification("Profile updation error", "error");
						setLoading(false);
					}
				},
				updateBankDetails,
				forgotPassword,
				resetPassword,
			}}>
			{loading && (
				<div
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						width: "100%",
						height: "100%",
						backgroundColor: "rgba(0, 0, 0, 0.5)",
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						zIndex: 9999,
					}}>
					<ClipLoader size={50} color='#ffffff' />
				</div>
			)}
			{children}
		</CustomerAuthContext.Provider>
	);
};

export const useCustomerAuth = () => useContext(CustomerAuthContext);
