-- Updated function to submit a devotion with server-enforced timestamp
-- Supports both image-based and text-based devotions
-- Now accepts an optional date parameter for calendar-based submission

CREATE OR REPLACE FUNCTION submit_devotion(
  p_user_id UUID,
  p_image_url TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
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
  INSERT INTO devotions (user_id, devotion_date, image_url, notes, created_at)
  VALUES (p_user_id, v_devotion_date, p_image_url, p_notes, NOW())
  RETURNING * INTO v_devotion;
  
  RETURN v_devotion;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION submit_devotion(UUID, TEXT, TEXT, DATE) TO authenticated;
