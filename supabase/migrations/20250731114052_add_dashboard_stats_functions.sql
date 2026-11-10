-- Create a function to get trainer dashboard statistics
CREATE OR REPLACE FUNCTION get_trainer_dashboard_stats()
RETURNS TABLE (
  active_trainees BIGINT,
  workouts_created BIGINT,
  sessions_this_week BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Count distinct trainees who have at least one workout
    (SELECT COUNT(DISTINCT u.id)::BIGINT
     FROM "user" u
     INNER JOIN workout w ON u.id = w.user_id
     WHERE u.role = 'trainee'),
    
    -- Count total workouts
    (SELECT COUNT(*)::BIGINT FROM workout),
    
    -- Count completed sessions in the last 7 days
    (SELECT COUNT(*)::BIGINT
     FROM workout_session
     WHERE start_time >= CURRENT_DATE - INTERVAL '7 days'
       AND end_time IS NOT NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_trainer_dashboard_stats() TO authenticated;

-- Create a function to get trainee dashboard statistics
CREATE OR REPLACE FUNCTION get_trainee_dashboard_stats(user_id UUID)
RETURNS TABLE (
  workouts_completed BIGINT,
  sessions_this_week BIGINT,
  current_streak BIGINT,
  total_workouts BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Count total completed workout sessions for this user
    (SELECT COUNT(*)::BIGINT
     FROM workout_session ws
     INNER JOIN workout w ON ws.workout_id = w.id
     WHERE w.user_id = get_trainee_dashboard_stats.user_id
       AND ws.end_time IS NOT NULL),
    
    -- Count completed sessions in the last 7 days for this user
    (SELECT COUNT(*)::BIGINT
     FROM workout_session ws
     INNER JOIN workout w ON ws.workout_id = w.id
     WHERE w.user_id = get_trainee_dashboard_stats.user_id
       AND ws.end_time >= CURRENT_DATE - INTERVAL '7 days'
       AND ws.end_time IS NOT NULL),
    
    -- Simple streak calculation - just count distinct workout days in last 30 days
    (SELECT COUNT(DISTINCT DATE(ws.end_time))::BIGINT
     FROM workout_session ws
     INNER JOIN workout w ON ws.workout_id = w.id
     WHERE w.user_id = get_trainee_dashboard_stats.user_id
       AND ws.end_time IS NOT NULL
       AND ws.end_time >= CURRENT_DATE - INTERVAL '30 days'),
    
    -- Count total workouts assigned to this user
    (SELECT COUNT(*)::BIGINT
     FROM workout w
     WHERE w.user_id = get_trainee_dashboard_stats.user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_trainee_dashboard_stats(UUID) TO authenticated; 