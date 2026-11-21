use rusqlite::Connection;

pub fn run_migrations(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch(crate::database::schema::SCHEMA_V1)?;
    conn.execute_batch(crate::database::schema::SCHEMA_V2)?;
    Ok(())
}
