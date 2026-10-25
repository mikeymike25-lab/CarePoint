-- Allow reading profiles so user details can be loaded cleanly
CREATE POLICY "Public profile read access" 
    ON profiles FOR SELECT 
    USING (true);
