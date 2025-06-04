import { useCallback, useEffect, useRef, useState } from 'react';

const PaymentButtons = ({
  userEmail,
  userName,
  amount = 30,
  onPaymentSuccess,
  onPaymentError
}) => {
  const paypalRef = useRef();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Configuración de PayPal
  const PAYPAL_CLIENT_ID = "AR2CtrcEiDx9kSgZ3iGxAhdEEd9S38Yv15RtsoTY-dMe15EbRNga_l2VQPxkiGP1wRKnE7sdBqlaLhOG";
  const PAYPAL_CURRENCY = "USD";

  // Función estable para inicializar PayPal
  const initializePayPal = useCallback(() => {
    if (!window.paypal || !paypalRef.current || isInitialized) {
      return;
    }

    try {
      window.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'blue',
          shape: 'rect',
          label: 'paypal',
          height: 40
        },

        createOrder: (data, actions) => {
          return actions.order.create({
            purchase_units: [{
              amount: {
                value: amount.toString(),
                currency_code: PAYPAL_CURRENCY
              },
              description: 'Curso Avatares',
              custom_id: userEmail
            }],
            application_context: {
              brand_name: 'Informatik-AI',
              landing_page: 'NO_PREFERENCE',
              user_action: 'PAY_NOW',
              shipping_preference: 'NO_SHIPPING',
              payment_method: {
                payee_preferred: 'UNRESTRICTED'
              }
            }
          });
        },

        onApprove: async (data, actions) => {
          try {
            const details = await actions.order.capture();

            if (onPaymentSuccess) {
              onPaymentSuccess({
                orderId: data.orderID,
                payerId: data.payerID,
                transactionId: details.id,
                amount: amount,
                currency: PAYPAL_CURRENCY,
                payerEmail: details.payer.email_address,
                status: details.status
              });
            }
          } catch (error) {
            if (onPaymentError) {
              onPaymentError('Error procesando el pago. Por favor, inténtalo de nuevo.');
            }
          }
        },

        onError: (err) => {
          if (onPaymentError) {
            onPaymentError('Error en el sistema de pagos. Por favor, inténtalo de nuevo.');
          }
        },

        onCancel: (data) => {
          if (onPaymentError) {
            onPaymentError('Pago cancelado por el usuario.');
          }
        }

      }).render(paypalRef.current);

      setIsInitialized(true);
      setIsLoading(false);

    } catch (error) {
      setError('Error inicializando sistema de pagos');
      setIsLoading(false);
    }
  }, [amount, userEmail, onPaymentSuccess, onPaymentError, isInitialized]);

  useEffect(() => {
    // Solo inicializar una vez
    if (isInitialized) {
      return;
    }

    // Cargar PayPal SDK
    const loadPayPalScript = () => {
      // Verificar si ya está cargado
      if (window.paypal) {
        initializePayPal();
        return;
      }

      // Verificar si el script ya existe
      const existingScript = document.querySelector(`script[src*="paypal.com/sdk/js"]`);
      if (existingScript) {
        existingScript.onload = () => initializePayPal();
        return;
      }

      // Crear script tag con soporte para tarjetas
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=${PAYPAL_CURRENCY}&intent=capture&enable-funding=card,credit,venmo`;
      script.async = true;

      script.onload = () => {
        initializePayPal();
      };

      script.onerror = () => {
        setError('Error cargando PayPal SDK');
        setIsLoading(false);
      };

      document.body.appendChild(script);
    };



    loadPayPalScript();

    // No cleanup para evitar errores de DOM
  }, []); // Solo ejecutar una vez

  if (error) {
    return (
      <div className="payment-error">
        <p style={{ color: '#dc2626', textAlign: 'center' }}>
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: '#dc2626',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            display: 'block',
            margin: '10px auto'
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="payment-buttons-container">
      <div className="payment-info" style={{ marginBottom: '20px', textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#1f2937' }}>
          Completa tu inscripción
        </h3>
        <p style={{ margin: '0 0 5px 0', color: '#6b7280' }}>
          Curso: Creación de Avatares Hiperrealistas
        </p>
        <p style={{ margin: '0 0 20px 0', fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
          ${amount} USD
        </p>
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>Cargando sistema de pagos...</p>
        </div>
      )}

      <div ref={paypalRef} style={{ minHeight: isLoading ? '0' : '50px' }}></div>

      <div className="payment-security" style={{ marginTop: '15px', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', color: '#6b7280' }}>
          🔒 Pago seguro procesado por PayPal
        </p>
      </div>
    </div>
  );
};

export default PaymentButtons;
