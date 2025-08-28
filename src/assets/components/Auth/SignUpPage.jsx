import { SignUp } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

const SignUpPage = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        width: "100vw",
        position: "fixed",
        top: 0,
        left: 0,
        
      }}
    >
      <SignUp
        path="/signup"
        routing="path"
        signInUrl="/signin"
        fallbackRedirectUrl="/profile"
        afterSignUp={() => navigate("/profile")}
        appearance={{
          variables: {
            fontFamily: "'Poppins', sans-serif",
            fontSize: "16px",
            colorText: "#1a1a1a",
          },
          elements: {
            card: {
              width: "400px",
              padding: "32px",
              borderRadius: "12px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
              backgroundColor: "white",
            },
            headerTitle: {
              fontSize: "24px",
              fontWeight: "600",
            },
          },
        }}
      />
    </div>
  );
};

export default SignUpPage;

