import { supabase } from '../../shared/lib/supabase';
import type { Message, Inquiry } from '../../shared/types/database';
import { RealtimeChannel } from '@supabase/supabase-js';

// ---- Order Chat Services ----

export const getOrderMessages = async (orderId: number): Promise<Message[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles(id, full_name, role)
    `)
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching order messages:', error);
    throw error;
  }
  return data as Message[];
};

export const sendOrderMessage = async (orderId: number, content: string, senderId: string): Promise<Message> => {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      order_id: orderId,
      content,
      sender_id: senderId
    })
    .select(`
      *,
      sender:profiles(id, full_name, role)
    `)
    .single();

  if (error) {
    console.error('Error sending order message:', error);
    throw error;
  }
  return data as Message;
};

export const subscribeToOrderMessages = (
  orderId: number,
  onMessage: (msg: Message) => void,
  onOrderUpdate?: (status: string) => void
): RealtimeChannel => {
  const channel = supabase
    .channel(`order_messages_${orderId}_${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `order_id=eq.${orderId}`
      },
      async (payload) => {
        // Fetch the sender details since postgres_changes doesn't include joins
        const { data } = await supabase
          .from('messages')
          .select(`*, sender:profiles(id, full_name, role)`)
          .eq('message_id', payload.new.message_id)
          .single();
        if (data) onMessage(data as Message);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `order_id=eq.${orderId}`
      },
      (payload) => {
        if (payload.new?.status && onOrderUpdate) {
          onOrderUpdate(payload.new.status);
        }
      }
    )
    .subscribe();
  return channel;
};

// ---- Prescription Inquiry Services ----

export const createPrescriptionInquiry = async (
  pharmacyId: number,
  itemId: number,
  initialMessage: string,
  customerId: string
): Promise<Inquiry> => {
  // 1. Create the inquiry
  const { data: inquiry, error: inquiryError } = await supabase
    .from('inquiries')
    .insert({
      customer_id: customerId,
      pharmacy_id: pharmacyId,
      item_id: itemId,
      subject: 'Prescription Stock Inquiry'
    })
    .select(`
      *,
      pharmacy:pharmacies(*),
      item:master_catalog(*)
    `)
    .single();

  if (inquiryError) {
    console.error('Error creating inquiry:', inquiryError);
    throw inquiryError;
  }

  // 2. Send the initial message
  await supabase
    .from('messages')
    .insert({
      inquiry_id: inquiry.inquiry_id,
      content: initialMessage,
      sender_id: customerId
    });

  return inquiry as Inquiry;
};

export const getInquiryDetails = async (inquiryId: number): Promise<Inquiry> => {
  const { data, error } = await supabase
    .from('inquiries')
    .select(`
      *,
      pharmacy:pharmacies(*),
      item:master_catalog(*),
      customer:profiles(*)
    `)
    .eq('inquiry_id', inquiryId)
    .single();

  if (error) {
    console.error('Error fetching inquiry details:', error);
    throw error;
  }
  return data as Inquiry;
};

export const getInquiryMessages = async (inquiryId: number): Promise<Message[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles(id, full_name, role)
    `)
    .eq('inquiry_id', inquiryId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching inquiry messages:', error);
    throw error;
  }
  return data as Message[];
};

export const sendInquiryMessage = async (inquiryId: number, content: string, senderId: string): Promise<Message> => {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      inquiry_id: inquiryId,
      content,
      sender_id: senderId
    })
    .select(`
      *,
      sender:profiles(id, full_name, role)
    `)
    .single();

  if (error) {
    console.error('Error sending inquiry message:', error);
    throw error;
  }
  return data as Message;
};

export const subscribeToInquiryMessages = (
  inquiryId: number,
  onMessage: (msg: Message) => void,
  onInquiryUpdate?: (status: string) => void
): RealtimeChannel => {
  const channel = supabase
    .channel(`inquiry_messages_${inquiryId}_${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `inquiry_id=eq.${inquiryId}`
      },
      async (payload) => {
        // Fetch the sender details
        const { data } = await supabase
          .from('messages')
          .select(`*, sender:profiles(id, full_name, role)`)
          .eq('message_id', payload.new.message_id)
          .single();
        if (data) onMessage(data as Message);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'inquiries',
        filter: `inquiry_id=eq.${inquiryId}`
      },
      (payload) => {
        if (payload.new?.status && onInquiryUpdate) {
          onInquiryUpdate(payload.new.status);
        }
      }
    )
    .subscribe();
  return channel;
};

export const subscribeToCustomerChatList = (
  customerId: string,
  onChange: () => void
): (() => void) => {
  const channel = supabase
    .channel(`customer_chat_list_${customerId}_${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'inquiries' }, () => onChange())
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => onChange())
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => onChange())
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pharmacies' }, () => onChange())
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const getOrdersWithMessages = async (customerId: string): Promise<import('../../shared/types/database').Order[]> => {
  // Fetch orders that have at least one message in the messages table
  const { data: messageOrderIds, error: msgError } = await supabase
    .from('messages')
    .select('order_id')
    .not('order_id', 'is', null);

  if (msgError) {
    console.error('Error fetching order message ids:', msgError);
    throw msgError;
  }

  const orderIds = [...new Set((messageOrderIds || []).map((m: any) => m.order_id).filter(Boolean))];
  if (orderIds.length === 0) return [];

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      pharmacy:pharmacies(*)
    `)
    .eq('customer_id', customerId)
    .in('order_id', orderIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching orders with messages:', error);
    throw error;
  }
  return (data || []) as import('../../shared/types/database').Order[];
};

export const getCustomerInquiries = async (customerId: string): Promise<Inquiry[]> => {
  const { data, error } = await supabase
    .from('inquiries')
    .select(`
      *,
      pharmacy:pharmacies(*),
      item:master_catalog(*)
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching customer inquiries:', error);
    throw error;
  }
  return data as Inquiry[];
};

export const cleanupSubscription = (channel: RealtimeChannel) => {
  supabase.removeChannel(channel);
};
