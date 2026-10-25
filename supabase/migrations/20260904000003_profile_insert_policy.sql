-- Allow users to insert and update their own profile during signup and profile editing
CREATE POLICY "Users can insert their own profile" 
    ON profiles FOR INSERT 
    WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" 
    ON profiles FOR UPDATE 
    USING (id = auth.uid());
