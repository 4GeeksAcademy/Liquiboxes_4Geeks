import React, { useState, useEffect } from 'react';
import axios from 'axios';
import "../../../styles/shops/contactsupport.css";
import { useNavigate } from 'react-router-dom';
import Modal from '../Modal';

const ContactSupport = () => {
  const [newform, setNewForm] = useState({
    saleId: null,
    subjectAffair: "",
    content: ""
  });
  const [userType, setUserType] = useState(null);
  const [isModalLoggingOpen, setIsModalLoggingOpen] = useState(false);
  const [isModalSuccessOpen, setIsModalSuccessOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUserType = sessionStorage.getItem('userType');
    setUserType(storedUserType);

    if (!storedUserType) {
      setIsModalLoggingOpen(true);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewForm(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = sessionStorage.getItem('token');

    if (!userType) {
      setIsModalLoggingOpen(true);
      return;
    }

    try {
      const response = await axios.post(`${process.env.BACKEND_URL}/notifications/${userType}/contactsupport`,
        newform,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      setIsModalSuccessOpen(true);
      setNewForm({
        saleId: null,
        subjectAffair: "",
        content: ""
      });
    } catch (error) {
      console.error(error);
    }
  };

  const closeLoginModal = () => {
    setIsModalLoggingOpen(false);
    navigate('/');
  };

  const closeSuccessModal = () => {
    setIsModalSuccessOpen(false);
    if (userType === 'user'){
      navigate('/home');
    }
    navigate('/shophome');
  };

  return (
    <div className="contact-support-container mt-5">
      <h2>Contacto con Soporte</h2>
      <form onSubmit={handleSubmit} className="contact-support-form">
        <div className="form-group">
          <label htmlFor="ventaId">ID de Venta (Opcional)</label>
          <input
            type="number"
            id="ventaId"
            name='saleId'
            value={newform.saleId}
            onChange={handleChange}
            placeholder="Ingrese el ID de la venta si aplica"
          />
        </div>

        <div className="form-group">
          <label htmlFor="asunto">Asunto *</label>
          <input
            type="text"
            id="asunto"
            name='subjectAffair'
            value={newform.subjectAffair}
            onChange={handleChange}
            placeholder="Escriba el asunto"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="contenido">Contenido *</label>
          <textarea
            id="contenido"
            name='content'
            value={newform.content}
            onChange={handleChange}
            placeholder="Describa su consulta"
            required
          />
        </div>

        <button type="submit">Enviar</button>
      </form>

      <Modal
        isOpen={isModalLoggingOpen}
        onClose={closeLoginModal}
        title="Iniciar sesión requerido"
        body='Para ponerte en contacto con soporte, necesitas iniciar sesión.'
        buttonBody='Iniciar sesión'
      />

      <Modal
        isOpen={isModalSuccessOpen}
        onClose={closeSuccessModal}
        title='Mensaje de contacto con soporte enviado'
        body='Mensaje de contacto con soporte enviado, contactaremos lo antes posible.'
        buttonBody='Volver al panel de control'
      />
    </div>
  );
};

export default ContactSupport;