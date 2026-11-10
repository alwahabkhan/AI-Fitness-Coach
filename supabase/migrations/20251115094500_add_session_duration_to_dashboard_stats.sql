-- Update get_trainee_dashboard_stats to include total session duration
CREATE OR REPLACE FUNCTION get_trainee_dashboard_stats(user_id UUID)
RETURNS TABLE (
  workouts_completed BIGINT,
  sessions_this_week BIGINT,
  current_streak BIGINT,
  total_workouts BIGINT,
  total_duration_minutes NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::BIGINT
     FROM workout_session ws
     INNER JOIN workout w ON ws.workout_id = w.id
     WHERE w.user_id = get_trainee_dashboard_stats.user_id
       AND ws.end_time IS NOT NULL),
    (SELECT COUNT(*)::BIGINT
     FROM workout_session ws
     INNER JOIN workout w ON ws.workout_id = w.id
     WHERE w.user_id = get_trainee_dashboard_stats.user_id
       AND ws.end_time >= CURRENT_DATE - INTERVAL '7 days'
       AND ws.end_time IS NOT NULL),
    (SELECT COUNT(DISTINCT DATE(ws.end_time))::BIGINT
     FROM workout_session ws
     INNER JOIN workout w ON ws.workout_id = w.id
     WHERE w.user_id = get_trainee_dashboard_stats.user_id
       AND ws.end_time IS NOT NULL
       AND ws.end_time >= CURRENT_DATE - INTERVAL '30 days'),
    (SELECT COUNT(*)::BIGINT
     FROM workout w
     WHERE w.user_id = get_trainee_dashboard_stats.user_id),
    COALESCE(
      (
        SELECT SUM(EXTRACT(EPOCH FROM (ws.end_time - ws.start_time))) / 60
        FROM workout_session ws
        INNER JOIN workout w ON ws.workout_id = w.id
        WHERE w.user_id = get_trainee_dashboard_stats.user_id
          AND ws.end_time IS NOT NULL
          AND ws.start_time IS NOT NULL
      ),
      0
    )::NUMERIC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_trainee_dashboard_stats(UUID) TO authenticated;

