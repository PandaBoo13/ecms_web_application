-- Certificates are issued by the center for COMPLETED offline enrollments only.
-- One certificate per enrollment. The PDF file itself is stored outside the public
-- uploads directory and is served through an authorized download endpoint.
CREATE TABLE IF NOT EXISTS certificates (
    certificate_id BIGSERIAL PRIMARY KEY,
    certificate_code VARCHAR(40) NOT NULL,
    enrollment_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,
    student_code VARCHAR(20),
    student_name VARCHAR(255) NOT NULL,
    course_title VARCHAR(255) NOT NULL,
    final_score NUMERIC(5, 2),
    completed_at TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'ISSUED',
    file_path VARCHAR(500) NOT NULL,
    original_file_name VARCHAR(255),
    issued_at TIMESTAMP NOT NULL DEFAULT now(),
    issued_by BIGINT NOT NULL,
    revoked_at TIMESTAMP,
    revoked_by BIGINT,
    revoke_reason TEXT,
    CONSTRAINT uk_certificates_code UNIQUE (certificate_code),
    CONSTRAINT uk_certificates_enrollment UNIQUE (enrollment_id),
    CONSTRAINT fk_certificates_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments (enrollment_id),
    CONSTRAINT fk_certificates_student FOREIGN KEY (student_id) REFERENCES students (id),
    CONSTRAINT fk_certificates_course FOREIGN KEY (course_id) REFERENCES course (id)
);

CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates (student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course ON certificates (course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates (status);
