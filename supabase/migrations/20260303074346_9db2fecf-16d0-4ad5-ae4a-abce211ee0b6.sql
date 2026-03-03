-- Fix stuck users at position 1 - they should be at 0 (off queue)
UPDATE profiles SET queue_position = 0 WHERE queue_position = 1;