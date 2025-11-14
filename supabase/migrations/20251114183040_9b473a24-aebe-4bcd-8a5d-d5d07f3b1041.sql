-- Add photos array field to couple_diaries table
ALTER TABLE couple_diaries 
ADD COLUMN photos TEXT[] DEFAULT '{}';

COMMENT ON COLUMN couple_diaries.photos IS 'Array of photo URLs associated with the diary entry';