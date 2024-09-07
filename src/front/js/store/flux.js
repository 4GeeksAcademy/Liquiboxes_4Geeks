import axios from "axios";

const getState = ({ getStore, getActions, setStore }) => {
    return {
        store: {
            message: null,
            cart: JSON.parse(localStorage.getItem("cart")) || [],
            categories: ['Moda', 'Ropa de Trabajo', 'Tecnología', 'Carpintería', 'Outdoor', 'Deporte', 'Arte', 'Cocina', 'Jardinería', 'Música', 'Viajes', 'Lectura', 'Cine', 'Fotografía', 'Yoga'],
            mysteryBoxDetail: {},
            isLoading: true,
            error: null,
            allShops: [],
            filteredShops: [],
            searchTerm: "",
            userData: null,
            shopDetail: {},
        },
        actions: {
            getMessage: async () => {
                try {
                    const resp = await fetch(process.env.BACKEND_URL + "/hello");
                    const data = await resp.json();
                    setStore({ message: data.message });
                    return data;
                } catch (error) {
                    console.error("Error loading message from backend", error);
                }
            },


            fetchShops: async () => {
                try {
                    setStore({ isLoading: true, error: null });
                    const url = `${process.env.BACKEND_URL}/shops`;
                    const response = await axios.get(url);
                    const shopsData = response.data || [];

                    const processedShops = shopsData.map(shop => ({
                        ...shop,
                        categories: shop.categories.map(cat => {
                            try {
                                // Intenta parsear la categoría si es un string JSON
                                const parsed = JSON.parse(cat);
                                return parsed.replace(/["\[\]]/g, '').trim().toLowerCase();
                            } catch (e) {
                                // Si no se puede parsear, simplemente limpia y devuelve la cadena
                                return cat.replace(/["\[\]]/g, '').trim().toLowerCase();
                            }
                        })
                    }));

                    setStore({
                        allShops: processedShops,
                        filteredShops: processedShops,
                        isLoading: false
                    });
                } catch (error) {
                    console.error("Error fetching shops:", error);
                    setStore({
                        error: "No se pudieron cargar las tiendas. Por favor, intente más tarde.",
                        isLoading: false
                    });
                }
            },

            fetchUserProfile: async () => {
                try {
                    const token = sessionStorage.getItem('token');
                    if (!token) {
                        console.log("No token found");
                        getActions().logout();
                        return;
                    }
                    const response = await axios.get(`${process.env.BACKEND_URL}/users/profile`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (response.data && typeof response.data === 'object') {
                        setStore({
                            userData: response.data,
                            userCategories: response.data.categories
                        });
                    } else {
                        throw new Error("Invalid response format");
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                    if (error.response && error.response.status === 401) {
                        getActions().logout();
                    } else {
                        setStore({ error: "No se pudo cargar el perfil del usuario. Por favor, intente más tarde." });
                    }
                }
            },

            logout: () => {
                sessionStorage.removeItem('token');
                setStore({
                    userData: null,
                    error: null
                });
            },


            addToCart: (id) => {
                let cart = [];
            
                // Si el store no tiene el carrito, lo obtenemos del localStorage
                if (!getStore().cart) {
                    cart = JSON.parse(localStorage.getItem("cart") || "[]");
                } else {
                    cart = getStore().cart;
                }
            
                // Verificamos si el item con este mysterybox_id ya está en el carrito
                const existingItemIndex = cart.findIndex(item => item.mysterybox_id == id);
            
                if (existingItemIndex !== -1) {
                    // Si ya existe, incrementamos la cantidad
                    cart[existingItemIndex] = {
                        ...cart[existingItemIndex],
                        quantity: cart[existingItemIndex].quantity + 1
                    };
                } else {
                    // Aseguramos que el id no sea null o undefined antes de agregar
                    if (id) {
                        let mysterybox_id = id;
                        cart.push({ mysterybox_id, quantity: 1 });
                    } else {
                        console.error("El ID es inválido, no se puede añadir al carrito");
                    }
                }
            
                // Actualizamos el carrito en el store y en localStorage
                setStore({ cart });
                localStorage.setItem("cart", JSON.stringify(cart));
                return cart;
            },

            removeFromCart: (id) => {
                const store = getStore();
                let cart = store.cart || JSON.parse(localStorage.getItem("cart") || "[]");
                
                // Filtramos el carrito para eliminar el item con el id especificado
                cart = cart.filter(item => item.mysterybox_id != id);
                
                // Actualizamos el carrito en el store y en localStorage
                setStore({ cart });
                localStorage.setItem("cart", JSON.stringify(cart));
                
                return cart;
            },
            
            decreaseQuantity: (id) => {
                const store = getStore();
                let cart = store.cart || JSON.parse(localStorage.getItem("cart") || "[]");
                
                const existingItemIndex = cart.findIndex(item => item.mysterybox_id == id);
                
                if (existingItemIndex !== -1) {
                    if (cart[existingItemIndex].quantity > 1) {
                        // Si la cantidad es mayor que 1, la reducimos
                        cart[existingItemIndex] = {
                            ...cart[existingItemIndex],
                            quantity: cart[existingItemIndex].quantity - 1
                        };
                    } else {
                        // Si la cantidad es 1, eliminamos el item del carrito
                        cart = cart.filter(item => item.mysterybox_id != id);
                    }
                    
                    // Actualizamos el carrito en el store y en localStorage
                    setStore({ cart });
                    localStorage.setItem("cart", JSON.stringify(cart));
                }
                
                return cart;
            },
            
            

            getCartItemDetails: async (id) => {
                try {
                    const response = await axios.get(process.env.BACKEND_URL + `/shops/mystery-box/${id}`);
                    if (response.data) {
                        return response.data;
                    }
                } catch (error) {
                    console.log("Error al obtener detalles del item del carrito:", error);
                    return null;
                }
            },

            fetchSingleItemDetail: async (id) => {
                try {
                    const response = await axios.get(process.env.BACKEND_URL + `/shops/mystery-box/${id}`);
                    if (response.data) {
                        console.log("Se ha ejecutado satisfactoriamente fetchSingleDetail")
                        return response.data;
                    }
                } catch (error) {
                    console.log("Error al obtener detalles del item:", error);
                    return null;
                }
            },

            getCartTotal: async () => {
                const actions = getActions();
                const cartItems = await actions.getCartItemsDetails();
                return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
            },


            getMysteryBoxDetail: async (id) => {
                try {
                    const response = await axios.get(process.env.BACKEND_URL + `/shops/mystery-box/${id}`)
                    if (response.data) {
                        console.log("La API devuelve datos")
                        setStore({ mysteryBoxDetail: response.data })
                    }
                } catch (error) {
                    console.log("ha habido un error" + error)

                }
            },

            getShopDetail: async (id) => {
                try {
                    const response = await axios.get(process.env.BACKEND_URL + `/shops/${id}`)
                    if (response.data) {
                        console.log(response.data)
                        setStore({ shopDetail: response.data })
                    }
                } catch (error) {
                    console.log("ha habido un error" + error)

                }
            },
        }
    };
};

export default getState;