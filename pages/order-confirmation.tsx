import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import styles from '../styles/OrderConfirmation.module.css';

const OrderConfirmation: React.FC = () => {
  const router = useRouter();
  const { status, reason, orderId } = router.query;
  const [message, setMessage] = useState<string>('');
  const [isChecking, setIsChecking] = useState<boolean>(false);

  useEffect(() => {
    let newMessage = '';
    switch (status) {
      case 'success':
        newMessage = 'Thank you for your order! Your payment has been successfully processed.';
        break;
      case 'cancelled':
        newMessage = 'Your order has been cancelled. No charges have been made.';
        break;
      case 'error':
        switch (reason) {
          case 'missing_invoice':
            newMessage = 'Error: Missing order ID. Please contact support with your payment details.';
            break;
          case 'no_transaction':
            newMessage = `Error: No transaction found for your order (Order ID: ${orderId || 'Unknown'}). It may still be processing. Checking status...`;
            break;
          case 'no_order':
            newMessage = `Error: Order not found (Order ID: ${orderId || 'Unknown'}). Please contact support.`;
            break;
          case 'server_error':
            newMessage = 'Error: A server error occurred. Please contact support.';
            break;
          default:
            if (reason && reason.toString().startsWith('payment_status_')) {
              const paymentStatus = reason.toString().replace('payment_status_', '');
              newMessage = `Error: Payment status is ${paymentStatus} (Order ID: ${orderId || 'Unknown'}). Please contact support.`;
            } else {
              newMessage = `Error: An unexpected error occurred (Order ID: ${orderId || 'Unknown'}). Please contact support.`;
            }
            break;
        }
        break;
      default:
        newMessage = 'Error: Invalid order status. Please contact support.';
        break;
    }
    setMessage(newMessage);
  }, [status, reason, orderId]);

  useEffect(() => {
    if (status === 'error' && reason === 'no_transaction' && orderId && !isChecking) {
      const checkTransaction = async () => {
        setIsChecking(true);
        for (let attempt = 1; attempt <= 12; attempt++) {
          try {
            console.log(`Checking transaction status, attempt ${attempt}/12 for orderId: ${orderId}`);
            const response = await fetch(`/api/check-transaction?orderId=${orderId}`);
            const data = await response.json();
            if (response.ok && data.paymentStatus) {
              console.log('Transaction status:', data.paymentStatus);
              const normalizedStatus = data.paymentStatus.toLowerCase();
              if (normalizedStatus === 'completed') {
                router.push('/order-confirmation?status=success');
                return;
              } else {
                setMessage(`Error: Payment status is ${data.paymentStatus} (Order ID: ${orderId}). Please contact support.`);
                return;
              }
            } else {
              console.log(`No transaction found on attempt ${attempt}/12`);
            }
          } catch (error) {
            console.error('Check transaction error:', error);
          }
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        setMessage(`Error: No transaction found for your order (Order ID: ${orderId}). Please contact support.`);
        setIsChecking(false);
      };
      checkTransaction();
    }
  }, [status, reason, orderId, router, isChecking]);

  const checkTransactionStatus = async () => {
    if (!orderId || isChecking) return;
    setIsChecking(true);
    try {
      console.log(`Manual check for transaction status, orderId: ${orderId}`);
      const response = await fetch(`/api/check-transaction?orderId=${orderId}`);
      const data = await response.json();
      if (response.ok && data.paymentStatus) {
        console.log('Transaction status:', data.paymentStatus);
        // Normalize case for comparison
        const normalizedStatus = data.paymentStatus.toLowerCase();
        if (normalizedStatus === 'completed') {
          router.push('/order-confirmation?status=success');
        } else {
          setMessage(`Error: Payment status is ${data.paymentStatus} (Order ID: ${orderId}). Please contact support.`);
        }
      } else {
        setMessage(`Error: Unable to check transaction status (Order ID: ${orderId}). Please try again later.`);
      }
    } catch (error) {
      console.error('Check transaction error:', error);
      setMessage(`Error: Unable to check transaction status (Order ID: ${orderId}). Please try again later.`);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>{`Order Confirmation - ${message}`}</title>
        <meta name="description" content="Order confirmation status" />
      </Head>
      <Navbar />
      <main className={styles.main}>
        <h1>Order Confirmation</h1>
        <p className={status === 'success' ? styles.success : styles.error}>{message}</p>
        {reason === 'no_transaction' && orderId && (
          <button
            className={styles.checkButton}
            onClick={checkTransactionStatus}
            disabled={isChecking}
          >
            {isChecking ? 'Checking...' : 'Check Transaction Status Again'}
          </button>
        )}
        <button className={styles.backButton} onClick={() => router.push('/')}>
          Back to Home
        </button>
      </main>
    </div>
  );
};

export default OrderConfirmation;