import React, { useContext, useEffect, useState } from 'react';
import { Context } from "../store/appContext";
import axios from 'axios';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import PayPalCheckoutButton from '../component/PayingForm/PayPalCheckoutButton';
import StripePaymentForm from '../component/PayingForm/StripePaymentForm';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCreditCard, faShoppingCart } from '@fortawesome/free-solid-svg-icons';
import { faPaypal } from '@fortawesome/free-brands-svg-icons';

const stripePromise = loadStripe(process.env.STRIPE_PK);

const PayingForm = () => {
  const [checkoutCart, setCheckoutCart] = useState([]);
  const { store, actions } = useContext(Context);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('stripe');

  useEffect(() => {
    const fetchCartData = async () => {
      try {
        setIsLoading(true);
        let cartData = store.cartWithDetails || JSON.parse(localStorage.getItem("cartWithDetails") || "[]");
        if (cartData.length === 0) {
          throw new Error("El carrito está vacío");
        }
        setCheckoutCart(cartData);

        const totalPrice = cartData.reduce((sum, item) => sum + item.price * item.quantity, 0);
        setTotal(totalPrice);
        setError(null);

        // Fetch user profile
        const token = sessionStorage.getItem('token');
        if (!token) {
          throw new Error("No se encontró el token de autenticación");
        }
        const response = await axios.get(`${process.env.BACKEND_URL}/users/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserProfile(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCartData();
  }, [store.cartWithDetails]);

  const handleStripePaymentSuccess = async (paymentIntentId) => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        throw new Error("No se encontró el token de autenticación");
      }
  
      const response = await axios.post(
        `${process.env.BACKEND_URL}/sales/create`,
        {
          total_amount: total,
          items: checkoutCart.map(item => ({
            mystery_box_id: item.id,
            quantity: item.quantity
          })),
          stripe_payment_intent_id: paymentIntentId,
          user_data: userProfile
        },
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Respuesta del backend:', response.data);
      alert('Compra realizada con éxito. ID de la venta: ' + response.data.sale_id);
      actions.clearCart();
    } catch (err) {
      console.error("Error completo:", err);
      const errorMessage = err.response?.data?.error || err.message;
      console.error("Mensaje de error:", errorMessage);
      setError("Error al procesar la compra: " + errorMessage);
    }
  };

  const handlePayPalApprove = async (data, actions) => {
    try {
      const details = await actions.order.capture();
      const token = sessionStorage.getItem('token');
      if (!token) {
        throw new Error("No se encontró el token de autenticación");
      }
      const response = await axios.post(`${process.env.BACKEND_URL}/sales/create`, {
        total_amount: total,
        items: checkoutCart.map(item => ({
          mystery_box_id: item.id,
          quantity: item.quantity
        })),
        payment_method: 'paypal',
        paypal_order_id: details.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Transacción completada por ' + details.payer.name.given_name + '. ID de la venta: ' + response.data.sale_id);
      actions.clearCart();
    } catch (err) {
      setError("Error al procesar el pago: " + err.message);
    }
  };

  if (isLoading) return <div className="text-center">
    <div className="spinner-border text-primary" role="status">
      <span className="sr-only">Loading...</span>
    </div>
  </div>;

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="container mt-5">
      <h2 className="mb-4">
        <FontAwesomeIcon icon={faShoppingCart} className="mr-2" />
        Resumen de tu compra
      </h2>
      {checkoutCart.length > 0 ? (
        <>
          {/* Resumen del carrito */}
          {checkoutCart.map((item, index) => (
            <div key={index} className="card mb-3">
              <div className="card-body">
                <h5 className="card-title">{item.name}</h5>
                <p className="card-text">Cantidad: {item.quantity}</p>
                <p className="card-text">Precio: €{item.price.toFixed(2)}</p>
                <p className="card-text">Subtotal: €{(item.price * item.quantity).toFixed(2)}</p>
              </div>
            </div>
          ))}
          <div className="card mb-4">
            <div className="card-body">
              <h4 className="card-title">Total a pagar: €{total.toFixed(2)}</h4>
            </div>
          </div>

          {/* Datos de envío */}
          {userProfile && (
            <div className="card mb-4">
              <div className="card-body">
                <h4 className="card-title">Datos de envío</h4>
                <p>Nombre: {userProfile.name} {userProfile.surname}</p>
                <p>Dirección: {userProfile.address}</p>
                <p>Código Postal: {userProfile.postal_code}</p>
                <p>Email: {userProfile.email}</p>
              </div>
            </div>
          )}

          {/* Selección de método de pago */}
          <div className="mb-4">
            <h4 className="mb-3">Método de pago</h4>
            <div className="d-flex justify-content-center">
              <button
                className={`btn btn-lg mx-2 ${paymentMethod === 'stripe' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setPaymentMethod('stripe')}
              >
                <FontAwesomeIcon icon={faCreditCard} className="mr-2" />
                Tarjeta de crédito
              </button>
              <button
                className={`mx-2`}
                onClick={() => setPaymentMethod('paypal')}
              >
                <FontAwesomeIcon icon={faPaypal} className="mr-2" />
                PayPal
              </button>
            </div>
          </div>

          {/* Formulario de pago de Stripe */}
          {paymentMethod === 'stripe' && (
            <Elements stripe={stripePromise}>
              <StripePaymentForm
                items={checkoutCart}
                total={total}
                onPaymentSuccess={handleStripePaymentSuccess}
                onPaymentError={(err) => setError("Error en Stripe: " + err)}
                userProfile={userProfile}
              />
            </Elements>
          )}

          {/* Botón de PayPal */}
          {paymentMethod === 'paypal' && (
            <PayPalCheckoutButton />
          )}
        </>
      ) : (
        <div className="alert alert-warning">El carrito está vacío. Añade productos antes de proceder al pago.</div>
      )}
    </div>
  );
};

export default PayingForm;