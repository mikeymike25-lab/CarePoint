-- Migration: 20260905000011_notifications_table.sql
-- Description: Create notifications table with RLS, Realtime publication, and automated triggers.

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'order', -- 'order', 'order_status', 'message', 'inquiry', 'promotion', 'system'
    link_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(user_id, created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Users can view their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert notifications for themselves
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;
CREATE POLICY "Users can insert their own notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Pharmacy Staff and Admins can create notifications for customers
DROP POLICY IF EXISTS "Staff and Admins can insert notifications" ON public.notifications;
CREATE POLICY "Staff and Admins can insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('staff', 'admin')
        )
    );

-- Users can update (e.g. mark as read) their own notifications
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications"
    ON public.notifications FOR DELETE
    USING (auth.uid() = user_id);

-- Admins have full access to notifications
DROP POLICY IF EXISTS "Admins have full access to notifications" ON public.notifications;
CREATE POLICY "Admins have full access to notifications"
    ON public.notifications FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 5. Enable Realtime Replication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Fallback if publication doesn't exist yet or permission varies
    NULL;
END $$;

-- 6. Automated Trigger: Order Placed Notification
CREATE OR REPLACE FUNCTION public.handle_order_created_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (user_id, title, message, type, link_url, metadata)
    VALUES (
        NEW.customer_id,
        'Order Placed #' || NEW.order_id,
        'Your order totaling ₱' || TO_CHAR(NEW.total_amount, 'FM999,999.00') || ' has been placed successfully and is pending confirmation.',
        'order',
        '/customer/orders/' || NEW.order_id,
        jsonb_build_object('order_id', NEW.order_id, 'pharmacy_id', NEW.pharmacy_id, 'method', NEW.method)
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_order_created_notification ON public.orders;
CREATE TRIGGER trg_order_created_notification
    AFTER INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_order_created_notification();

-- 7. Automated Trigger: Order Status Changed Notification
CREATE OR REPLACE FUNCTION public.handle_order_status_notification()
RETURNS TRIGGER AS $$
DECLARE
    status_label TEXT;
    status_desc TEXT;
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        CASE NEW.status
            WHEN 'confirmed' THEN
                status_label := 'Order Confirmed';
                status_desc := 'Great news! The pharmacy has confirmed your order #' || NEW.order_id || '.';
            WHEN 'ready' THEN
                status_label := 'Order Ready for ' || INITCAP(NEW.method);
                status_desc := 'Your order #' || NEW.order_id || ' is packed and ready for ' || NEW.method || '.';
            WHEN 'completed' THEN
                status_label := 'Order Completed';
                status_desc := 'Your order #' || NEW.order_id || ' has been marked completed. Thank you for choosing CarePoint!';
            WHEN 'cancelled' THEN
                status_label := 'Order Cancelled';
                status_desc := 'Your order #' || NEW.order_id || ' was cancelled.';
            ELSE
                status_label := 'Order Updated (' || INITCAP(NEW.status) || ')';
                status_desc := 'Status for order #' || NEW.order_id || ' changed to ' || NEW.status || '.';
        END CASE;

        INSERT INTO public.notifications (user_id, title, message, type, link_url, metadata)
        VALUES (
            NEW.customer_id,
            status_label,
            status_desc,
            'order_status',
            '/customer/orders/' || NEW.order_id,
            jsonb_build_object('order_id', NEW.order_id, 'status', NEW.status)
        );
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_order_status_notification ON public.orders;
CREATE TRIGGER trg_order_status_notification
    AFTER UPDATE OF status ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_order_status_notification();
