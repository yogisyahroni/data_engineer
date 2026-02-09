package services

import (
	"container/list"
	"context"
	"fmt"
	"insight-engine-backend/database"
	"insight-engine-backend/models"
	"sync"
	"time"
)

// JobType represents the type of background job
type JobType string

const (
	JobTypePipeline JobType = "PIPELINE"
	JobTypeDataflow JobType = "DATAFLOW"
)

// Job represents a background job
type Job struct {
	ID        string
	Type      JobType
	EntityID  string // Pipeline ID or Dataflow ID
	CreatedAt time.Time
	Retries   int
}

// JobQueue manages background jobs
type JobQueue struct {
	queue      *list.List
	mu         sync.Mutex
	maxWorkers int
	workers    int
	ctx        context.Context
	cancel     context.CancelFunc
}

// NewJobQueue creates a new job queue
func NewJobQueue(maxWorkers int) *JobQueue {
	ctx, cancel := context.WithCancel(context.Background())
	return &JobQueue{
		queue:      list.New(),
		maxWorkers: maxWorkers,
		ctx:        ctx,
		cancel:     cancel,
	}
}

// Enqueue adds a job to the queue
func (jq *JobQueue) Enqueue(job Job) {
	jq.mu.Lock()
	defer jq.mu.Unlock()

	jq.queue.PushBack(job)
	LogInfo("job_enqueue", "Job enqueued successfully", map[string]interface{}{"job_id": job.ID, "job_type": job.Type})
}

// Dequeue removes and returns the next job from the queue
func (jq *JobQueue) Dequeue() *Job {
	jq.mu.Lock()
	defer jq.mu.Unlock()

	if jq.queue.Len() == 0 {
		return nil
	}

	element := jq.queue.Front()
	job := element.Value.(Job)
	jq.queue.Remove(element)

	return &job
}

// Start begins processing jobs
func (jq *JobQueue) Start() {
	LogInfo("job_queue_start", "Job queue started", map[string]interface{}{"workers": jq.maxWorkers})

	for i := 0; i < jq.maxWorkers; i++ {
		go jq.worker(i)
	}
}

// Stop gracefully stops the job queue
func (jq *JobQueue) Stop() {
	LogInfo("job_queue_stop", "Stopping job queue", nil)
	jq.cancel()
}

// worker processes jobs from the queue
func (jq *JobQueue) worker(id int) {
	LogInfo("job_worker_start", "Worker started", map[string]interface{}{"worker_id": id})

	for {
		select {
		case <-jq.ctx.Done():
			LogInfo("job_worker_stop", "Worker stopped", map[string]interface{}{"worker_id": id})
			return
		default:
			job := jq.Dequeue()
			if job == nil {
				time.Sleep(1 * time.Second)
				continue
			}

			LogInfo("job_process_start", "Worker processing job", map[string]interface{}{"worker_id": id, "job_id": job.ID, "job_type": job.Type})

			if err := jq.processJob(job); err != nil {
				LogError("job_process_failed", "Worker failed to process job", map[string]interface{}{"worker_id": id, "job_id": job.ID, "error": err})

				// Retry logic
				if job.Retries < 3 {
					job.Retries++
					LogInfo("job_retry", "Retrying job", map[string]interface{}{"job_id": job.ID, "attempt": job.Retries, "max_retries": 3})
					time.Sleep(time.Duration(job.Retries) * 5 * time.Second) // Exponential backoff
					jq.Enqueue(*job)
				} else {
					LogError("job_failed_final", "Job failed after maximum retries", map[string]interface{}{"job_id": job.ID, "retries": 3})
					jq.markJobFailed(job, err)
				}
			} else {
				LogInfo("job_success", "Worker completed job successfully", map[string]interface{}{"worker_id": id, "job_id": job.ID})
			}
		}
	}
}

// processJob executes the job based on its type
func (jq *JobQueue) processJob(job *Job) error {
	switch job.Type {
	case JobTypePipeline:
		return jq.processPipeline(job.EntityID)
	case JobTypeDataflow:
		return jq.processDataflow(job.EntityID)
	default:
		return fmt.Errorf("unknown job type: %s", job.Type)
	}
}

// processPipeline executes a pipeline
func (jq *JobQueue) processPipeline(pipelineID string) error {
	// Find the execution record
	var execution models.JobExecution
	if err := database.DB.Where("pipeline_id = ? AND status = ?", pipelineID, "PENDING").
		Order("started_at DESC").
		First(&execution).Error; err != nil {
		return fmt.Errorf("execution not found: %w", err)
	}

	// Update status to PROCESSING
	execution.Status = "PROCESSING"
	database.DB.Save(&execution)

	// NOTE: Actual pipeline execution logic is business-specific and depends on
	// the pipeline configuration stored in the database. This would typically:
	// 1. Load pipeline steps from database
	// 2. Execute each step sequentially or in parallel
	// 3. Handle step dependencies and conditional execution
	// 4. Aggregate results and update execution metadata
	//
	// For now, this is a placeholder that simulates successful execution.
	// Production implementation should integrate with PipelineExecutor service.
	time.Sleep(2 * time.Second)

	// Update execution record
	now := time.Now()
	execution.Status = "COMPLETED"
	execution.CompletedAt = &now
	durationMs := int(now.Sub(execution.StartedAt).Milliseconds())
	execution.DurationMs = &durationMs
	execution.RowsProcessed = 100 // Mock value

	if err := database.DB.Save(&execution).Error; err != nil {
		return fmt.Errorf("failed to update execution: %w", err)
	}

	// Update pipeline last run status
	database.DB.Exec("UPDATE \"Pipeline\" SET last_run_at = ?, last_status = ? WHERE id = ?",
		now, "SUCCESS", pipelineID)

	return nil
}

// processDataflow executes a dataflow
func (jq *JobQueue) processDataflow(dataflowID string) error {
	// Find the run record
	var run models.DataflowRun
	if err := database.DB.Where("dataflow_id = ? AND status = ?", dataflowID, "PENDING").
		Order("started_at DESC").
		First(&run).Error; err != nil {
		return fmt.Errorf("run not found: %w", err)
	}

	// Update status to RUNNING
	run.Status = "RUNNING"
	database.DB.Save(&run)

	// NOTE: Actual dataflow execution logic is business-specific and depends on
	// the dataflow configuration. This would typically:
	// 1. Load dataflow nodes and edges from database
	// 2. Execute nodes in topological order based on dependencies
	// 3. Pass data between nodes according to edge configuration
	// 4. Handle transformations, aggregations, and joins
	// 5. Update run metadata with node-level execution details
	//
	// For now, this is a placeholder that simulates successful execution.
	// Production implementation should integrate with DataflowExecutor service.
	time.Sleep(2 * time.Second)

	// Update run record
	now := time.Now()
	run.Status = "COMPLETED"
	run.CompletedAt = &now

	if err := database.DB.Save(&run).Error; err != nil {
		return fmt.Errorf("failed to update run: %w", err)
	}

	return nil
}

// markJobFailed marks a job as failed in the database
func (jq *JobQueue) markJobFailed(job *Job, err error) {
	errorMsg := err.Error()

	switch job.Type {
	case JobTypePipeline:
		var execution models.JobExecution
		if dbErr := database.DB.Where("pipeline_id = ? AND status IN ?", job.EntityID, []string{"PENDING", "PROCESSING"}).
			Order("started_at DESC").
			First(&execution).Error; dbErr == nil {
			now := time.Now()
			execution.Status = "FAILED"
			execution.CompletedAt = &now
			durationMs := int(now.Sub(execution.StartedAt).Milliseconds())
			execution.DurationMs = &durationMs
			execution.Error = &errorMsg
			database.DB.Save(&execution)

			// Update pipeline last run status
			database.DB.Exec("UPDATE \"Pipeline\" SET last_run_at = ?, last_status = ? WHERE id = ?",
				now, "FAILED", job.EntityID)
		}

	case JobTypeDataflow:
		var run models.DataflowRun
		if dbErr := database.DB.Where("dataflow_id = ? AND status IN ?", job.EntityID, []string{"PENDING", "RUNNING"}).
			Order("started_at DESC").
			First(&run).Error; dbErr == nil {
			now := time.Now()
			run.Status = "FAILED"
			run.CompletedAt = &now
			run.Error = &errorMsg
			database.DB.Save(&run)
		}
	}
}

// Global job queue instance
var GlobalJobQueue *JobQueue

// InitJobQueue initializes the global job queue
func InitJobQueue(maxWorkers int) {
	GlobalJobQueue = NewJobQueue(maxWorkers)
	GlobalJobQueue.Start()
}

// ShutdownJobQueue gracefully shuts down the job queue
func ShutdownJobQueue() {
	if GlobalJobQueue != nil {
		GlobalJobQueue.Stop()
	}
}
