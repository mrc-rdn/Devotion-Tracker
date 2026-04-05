-- Function to submit a text-based devotion with server-enforced timestamp
-- This function ensures data integrity by using server-side timestamp

CREATE OR REPLACE FUNCTION submit_text_devotion(
  p_user_id UUID,
  p_content TEXT,
  p_date DATE DEFAULT NULL
)
RETURNS devotions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_devotion devotions%ROWTYPE;
  v_devotion_date DATE;
BEGIN
  -- Use provided date or server current date
  v_devotion_date := COALESCE(p_date, CURRENT_DATE);
  
  -- Check if user already has a devotion for this date
  IF EXISTS (
    SELECT 1 FROM devotions 
    WHERE user_id = p_user_id 
    AND devotion_date = v_devotion_date
  ) THEN
    RAISE EXCEPTION 'Devotion already exists for this date' USING ERRCODE = '23505';
  END IF;
  
  -- Insert the devotion
  INSERT INTO devotions (user_id, devotion_date, content, created_at)
  VALUES (p_user_id, v_devotion_date, p_content, NOW())
  RETURNING * INTO v_devotion;
  
  RETURN v_devotion;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION submit_text_devotion(UUID, TEXT, DATE) TO authenticated;
