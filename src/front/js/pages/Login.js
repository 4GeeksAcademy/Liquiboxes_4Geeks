import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { GoogleLogin } from "@react-oauth/google";
import { Context } from "../store/appContext";
import "../../styles/login.css"

export default function Login() {
    const { store, actions } = useContext(Context);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [loginData, setLoginData] = useState({
        email: "",
        password: ""
    });
    const navigate = useNavigate();

    const handleChange = (e) => {
        setLoginData({
            ...loginData,
            [e.target.name]: e.target.value,
        });
    };

    const attemptLogin = async (loginData) => {
        try {
            const baseUrl = process.env.BACKEND_URL;
            const response = await axios.post(`${baseUrl}/auth/login`, loginData, {
                headers: { "Content-Type": "application/json" },
            });
            return response.data;
        } catch (error) {
            console.log("Error en login:", error);
            if (error.response) {
                console.log("Response data:", error.response.data);
                console.log("Response status:", error.response.status);
                throw new Error(error.response.data.error || "Error de autenticación");
            } else if (error.request) {
                throw new Error("No se pudo conectar con el servidor");
            } else {
                throw new Error("Error al procesar la solicitud");
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setShowError(false);
        setErrorMessage("");

        try {
            const loginResult = await attemptLogin(loginData);
            if (loginResult && loginResult.access_token) {
                store.token = loginResult.access_token
                sessionStorage.setItem("token", loginResult.access_token);
                sessionStorage.setItem("userType", loginResult.user_type);
                console.log(`Ha entrado como ${loginResult.user_type}`);
                navigate(loginResult.user_type === "user" ? "/home" : "/shophome");
            }
        } catch (error) {
            console.log("Error de autenticación:", error);
            setShowError(true);
            setErrorMessage(error.message);
        }
    };

    const handleGoogleLogin = async (credentialResponse) => {
        try {
            const response = await axios.post(`${process.env.BACKEND_URL}/auth/google_login`, {
                token: credentialResponse.credential
            });

            const { access_token, user_type, is_new_user, google_data, user } = response.data;

            if (is_new_user) {
                // Usuario nuevo, navegar a la página de elección de tipo de registro
                navigate('/chooseregistration', {
                    state: {
                        google_data,
                        access_token
                    }
                });
            } else {
                // Usuario existente, guardar token y redirigir
                sessionStorage.setItem('token', access_token);
                sessionStorage.setItem('userType', user_type);
                navigate(user_type === 'normal' ? "/home" : "/shophome");
            }
        } catch (error) {
            console.log("Error en la autenticación con Google:", error);
            setShowError(true);
            setErrorMessage("Error en la autenticación con Google");
        }
    };

    return (
        <div className="login-container">
            <div className="login-form-wrapper">
                <h2 className="login-title">Iniciar Sesión</h2>
                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={loginData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Contraseña</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={loginData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    {showError && (
                        <div className="error-message">
                            {errorMessage}
                        </div>
                    )}
                    <button type="submit" className="login-button">Iniciar Sesión</button>
                </form>
                <div className="google-login-wrapper">
                    <GoogleLogin
                        onSuccess={handleGoogleLogin}
                        onError={() => {
                            console.log('Login Failed');
                            setShowError(true);
                            setErrorMessage("Error en la autenticación con Google");
                        }}
                    />
                </div>
            </div>
        </div>
    );
}